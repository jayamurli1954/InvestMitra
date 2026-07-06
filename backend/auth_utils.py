from datetime import datetime, timezone, timedelta
from typing import Optional
import re
import secrets
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ConfigDict
from fastapi import HTTPException
from dotenv import load_dotenv
from pathlib import Path

from app_config import get_secret_key

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv()

SECRET_KEY = get_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== AUTH MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    email: str
    name: str
    mobile: Optional[str] = None
    country_code: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None
    default_currency: Optional[str] = None
    password_hash: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "email"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    disclaimer_accepted: bool = False
    disclaimer_accepted_at: Optional[str] = None
    disclaimer_version: str = "1.0"


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    mobile: Optional[str] = None
    country_code: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None
    default_currency: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    disclaimer_accepted: bool = False


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserPublic


# ==================== AUTH UTILITIES ====================

def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ==================== PASSWORD RESET ====================

async def create_password_reset_record(db, user_id, email: str) -> str:
    reset_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    await db.password_resets.insert_one({
        "user_id": str(user_id),
        "email": email,
        "token": reset_token,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "used": False,
    })
    return reset_token


async def validate_reset_token(db, token: str):
    reset_record = await db.password_resets.find_one({"token": token})
    if not reset_record or reset_record.get("used"):
        return None

    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return None

    return reset_record


async def mark_reset_token_as_used(db, token: str) -> None:
    await db.password_resets.update_one({"token": token}, {"$set": {"used": True}})


async def invalidate_user_sessions(db, user_id: str) -> None:
    await db.user_sessions.delete_many({"user_id": str(user_id)})


def mask_email(email: str) -> str:
    parts = email.split("@")
    if len(parts) != 2:
        return email

    local_part = parts[0]
    domain = parts[1]
    masked_local = local_part[:3] + "***" if len(local_part) > 3 else "***"
    return f"{masked_local}@{domain}"


async def find_user_by_name(db, full_name: str):
    escaped = re.escape(full_name.strip())
    return await db.users.find_one({
        "name": {"$regex": f"^{escaped}$", "$options": "i"}
    })
