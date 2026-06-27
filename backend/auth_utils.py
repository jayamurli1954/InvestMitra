from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ConfigDict
import uuid
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "investmitra-default-secret-key-fallback-987654321")
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
    auth_provider: str = "email"  # "email" or "google"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # Disclaimer acceptance tracking
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
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# ============================================================================
# PASSWORD RESET FUNCTIONALITY
# ============================================================================

def generate_reset_token():
    """Generate a secure random token for password reset"""
    import secrets
    return secrets.token_urlsafe(32)


def create_password_reset_record(db, user_id: str, email: str):
    """Create a password reset token record in database"""
    from datetime import datetime, timedelta
    
    reset_token = generate_reset_token()
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(hours=24)
    
    reset_record = {
        "user_id": str(user_id),
        "email": email,
        "reset_token": reset_token,
        "created_at": created_at,
        "expires_at": expires_at,
        "used": False,
        "used_at": None
    }
    
    db["password_resets"].insert_one(reset_record)
    return reset_token


def validate_reset_token(db, reset_token: str):
    """Validate a password reset token"""
    from datetime import datetime
    
    reset_record = db["password_resets"].find_one({
        "reset_token": reset_token,
        "used": False
    })
    
    if not reset_record:
        return None
    
    if datetime.utcnow() > reset_record["expires_at"]:
        return None
    
    return reset_record


def mark_reset_token_as_used(db, reset_token: str):
    """Mark a password reset token as used"""
    from datetime import datetime
    
    result = db["password_resets"].update_one(
        {"reset_token": reset_token},
        {
            "$set": {
                "used": True,
                "used_at": datetime.utcnow()
            }
        }
    )
    
    return result.modified_count > 0


def mask_email(email: str):
    """Mask email address for security"""
    parts = email.split("@")
    local_part = parts[0]
    domain = parts[1]
    
    if len(local_part) > 3:
        masked_local = local_part[:3] + "***"
    else:
        masked_local = "***"
    
    return f"{masked_local}@{domain}"


def find_user_by_name(db, full_name: str):
    """Find user by full name"""
    user = db["users"].find_one({
        "full_name": {"$regex": full_name, "$options": "i"}
    })
    return user