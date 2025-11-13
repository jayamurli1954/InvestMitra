"""
Login Diagnostic Tool
Run this to troubleshoot login issues
"""

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from auth_utils import verify_password, get_password_hash
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def diagnose_login():
    print("\n" + "="*70)
    print("🔍 LOGIN DIAGNOSTIC TOOL")
    print("="*70 + "\n")

    # Check environment variables
    print("1. Checking Environment Variables...")
    mongo_url = os.getenv('MONGO_URL')
    db_name = os.getenv('DB_NAME')
    secret_key = os.getenv('SECRET_KEY')

    if not mongo_url:
        print("   ❌ MONGO_URL not set")
        return
    else:
        print(f"   ✅ MONGO_URL: {mongo_url}")

    if not db_name:
        print("   ❌ DB_NAME not set")
        return
    else:
        print(f"   ✅ DB_NAME: {db_name}")

    if not secret_key:
        print("   ❌ SECRET_KEY not set")
    else:
        print(f"   ✅ SECRET_KEY: {secret_key[:10]}...{secret_key[-4:]}")

    print()

    # Try to connect to MongoDB
    print("2. Testing MongoDB Connection...")
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        await db.command('ping')
        print("   ✅ MongoDB connection successful")
    except Exception as e:
        print(f"   ❌ MongoDB connection failed: {e}")
        return

    print()

    # List all users
    print("3. Checking Users in Database...")
    try:
        users_count = await db.users.count_documents({})
        print(f"   Total users in database: {users_count}")

        if users_count == 0:
            print("   ⚠️  No users found in database")
            print("   You need to register first!")
        else:
            print("\n   Users found:")
            async for user in db.users.find({}, {"email": 1, "name": 1, "password_hash": 1}):
                email = user.get('email', 'N/A')
                name = user.get('name', 'N/A')
                has_password = bool(user.get('password_hash'))
                print(f"   • {email} ({name}) - Password Hash: {'✅ Present' if has_password else '❌ Missing'}")
    except Exception as e:
        print(f"   ❌ Error querying users: {e}")
        return

    print()

    # Test login for specific user
    print("4. Test Login for Specific User")
    test_email = input("   Enter email to test: ").strip()
    test_password = input("   Enter password to test: ").strip()

    if not test_email or not test_password:
        print("   ⚠️  Skipping login test (no credentials provided)")
    else:
        print(f"\n   Testing login for: {test_email}")

        # Find user
        user_doc = await db.users.find_one({"email": test_email})
        if not user_doc:
            print(f"   ❌ User not found in database: {test_email}")
            print("   → You need to register this email first")
        else:
            print(f"   ✅ User found: {user_doc.get('name')}")

            # Check password hash
            password_hash = user_doc.get('password_hash')
            if not password_hash:
                print("   ❌ No password hash stored for this user")
                print("   → This user was created without a password")
                print("   → Try using 'Forgot Password' feature or re-register")
            else:
                print(f"   ✅ Password hash exists: {password_hash[:20]}...")

                # Verify password
                try:
                    is_valid = verify_password(test_password, password_hash)
                    if is_valid:
                        print("   ✅ PASSWORD CORRECT - Login should work!")
                    else:
                        print("   ❌ PASSWORD INCORRECT")
                        print("   → Double-check your password")
                        print("   → Use 'Forgot Password' feature if needed")
                except Exception as e:
                    print(f"   ❌ Error verifying password: {e}")

    print()

    # Offer to create test user
    print("5. Create Test User")
    create_test = input("   Create a test user? (yes/no): ").strip().lower()

    if create_test == 'yes':
        test_user_email = input("   Test user email: ").strip()
        test_user_password = input("   Test user password: ").strip()
        test_user_name = input("   Test user name: ").strip()

        if test_user_email and test_user_password and test_user_name:
            # Check if user exists
            existing = await db.users.find_one({"email": test_user_email})
            if existing:
                print(f"   ⚠️  User already exists: {test_user_email}")
                update = input("   Update password for existing user? (yes/no): ").strip().lower()
                if update == 'yes':
                    new_hash = get_password_hash(test_user_password)
                    await db.users.update_one(
                        {"email": test_user_email},
                        {"$set": {"password_hash": new_hash}}
                    )
                    print("   ✅ Password updated successfully")
            else:
                import uuid
                from datetime import datetime, timezone

                new_user = {
                    "_id": str(uuid.uuid4()),
                    "email": test_user_email,
                    "name": test_user_name,
                    "password_hash": get_password_hash(test_user_password),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "risk_profile": "Moderate",
                    "investment_goal": "Growth",
                    "disclaimer_accepted": True,
                    "disclaimer_accepted_at": datetime.now(timezone.utc).isoformat()
                }

                await db.users.insert_one(new_user)
                print(f"   ✅ Test user created successfully: {test_user_email}")
                print(f"   → You can now login with email: {test_user_email}")

    print("\n" + "="*70)
    print("Diagnostic Complete!")
    print("="*70 + "\n")

    client.close()

if __name__ == "__main__":
    asyncio.run(diagnose_login())
