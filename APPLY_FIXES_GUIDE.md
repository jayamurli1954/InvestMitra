# Complete Guide: Apply All Fixes to D:\investment_framework_build

Follow these steps **in order** to apply all fixes to your Windows laptop.

---

## STEP 1: Setup Environment File

### 1.1 Create `backend\.env` file

1. Open Command Prompt or Anaconda Prompt
2. Navigate to backend folder:
   ```
   cd D:\investment_framework_build\backend
   ```

3. Generate a SECRET_KEY:
   ```
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the output (it will look like: `xF3k9mN2pQ7rL8sT4vW6yZ1aC5bD0eG`)

4. Create `.env` file with this content (replace `YOUR_GENERATED_KEY` with the key from step 3):

```env
SECRET_KEY=YOUR_GENERATED_KEY
MONGO_URL=mongodb://localhost:27017
DB_NAME=investment_framework
FRONTEND_URL=http://localhost:3000

# Optional - only if you use these features:
# SMTP_EMAIL=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# GEMINI_API_KEY=your-api-key
```

Save the file as `backend\.env` (NOT .env.txt)

---

## STEP 2: Update Backend Files

### 2.1 Update `backend\auth_utils.py`

**Open:** `D:\investment_framework_build\backend\auth_utils.py` in a text editor

**CHANGE 1 - Add import at the top:**

FIND (around line 1-6):
```python
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ConfigDict
import uuid
```

REPLACE with:
```python
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ConfigDict
import uuid
import os
```

**CHANGE 2 - Update SECRET_KEY configuration:**

FIND (around line 8-11):
```python
# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production-12345678"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
```

REPLACE with:
```python
# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY environment variable is not set. "
        "Please set it in your .env file or environment. "
        "Generate a secure key using: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
```

**CHANGE 3 - Add disclaimer fields to User model:**

FIND the User class (around line 24-37):
```python
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
```

ADD these lines at the end (before the closing of the class):
```python
    # Disclaimer acceptance tracking
    disclaimer_accepted: bool = False
    disclaimer_accepted_at: Optional[str] = None
    disclaimer_version: str = "1.0"
```

**CHANGE 4 - Update UserRegister model:**

FIND:
```python
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
```

REPLACE with:
```python
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    disclaimer_accepted: bool = False
```

**Save the file!**

---

### 2.2 Update `backend\server.py`

**Open:** `D:\investment_framework_build\backend\server.py`

**FIND** the register endpoint (search for `async def register` - around line 505-519):

```python
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister, response: Response):
    """Register new user with email/password"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        auth_provider="email"
    )
```

**REPLACE with:**

```python
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister, response: Response):
    """Register new user with email/password"""
    # Validate disclaimer acceptance
    if not user_data.disclaimer_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must accept the Investment Disclaimer to register"
        )

    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with disclaimer acceptance
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        auth_provider="email",
        disclaimer_accepted=True,
        disclaimer_accepted_at=datetime.now(timezone.utc).isoformat(),
        disclaimer_version="1.0"
    )
```

**Save the file!**

---

## STEP 3: Create New Frontend Files

### 3.1 Create `frontend\src\components\DisclaimerText.jsx`

Create a **new file** at: `D:\investment_framework_build\frontend\src\components\DisclaimerText.jsx`

Copy the entire content from: `/home/user/investment_framework_build/frontend/src/components/DisclaimerText.jsx`
(This file was already created - you can find it in the project)

Or get the complete content from the earlier message where I created it.

### 3.2 Create `frontend\src\components\DisclaimerModal.jsx`

Create a **new file** at: `D:\investment_framework_build\frontend\src\components\DisclaimerModal.jsx`

Get content from the earlier creation.

### 3.3 Create `frontend\src\pages\Disclaimer.jsx`

Create a **new file** at: `D:\investment_framework_build\frontend\src\pages\Disclaimer.jsx`

Get content from the earlier creation.

---

## STEP 4: Update Frontend Files

### 4.1 Update `frontend\src\pages\Auth.jsx`

**Open:** `D:\investment_framework_build\frontend\src\pages\Auth.jsx`

**CHANGE 1 - Add import at top:**

FIND (around line 1-9):
```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
```

ADD this import:
```javascript
import DisclaimerModal from '@/components/DisclaimerModal';
```

**CHANGE 2 - Add state variables:**

FIND (around line 11-18):
```javascript
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
```

ADD these two new state variables:
```javascript
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
```

**CHANGE 3 - Update handleSubmit function:**

FIND the handleSubmit function (around line 48-65):
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    if (isLogin) {
      await login(formData.email, formData.password);
      toast.success('Logged in successfully!');
    } else {
      await register(formData.email, formData.password, formData.name);
      toast.success('Account created successfully!');
    }
  } catch (error) {
    console.error('Auth error:', error);
    const errorMsg = error.response?.data?.detail || 'Authentication failed';
    toast.error(errorMsg);
    setLoading(false);
  }
};
```

REPLACE with:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();

  // For registration, show disclaimer modal first
  if (!isLogin && !disclaimerAccepted) {
    setShowDisclaimerModal(true);
    return;
  }

  setLoading(true);
  try {
    if (isLogin) {
      await login(formData.email, formData.password);
      toast.success('Logged in successfully!');
    } else {
      await register(formData.email, formData.password, formData.name, disclaimerAccepted);
      toast.success('Account created successfully!');
    }
  } catch (error) {
    console.error('Auth error:', error);
    const errorMsg = error.response?.data?.detail || 'Authentication failed';
    toast.error(errorMsg);
    setLoading(false);
  }
};

const handleDisclaimerAccept = async () => {
  setDisclaimerAccepted(true);
  setShowDisclaimerModal(false);

  // Now proceed with registration
  setLoading(true);
  try {
    await register(formData.email, formData.password, formData.name, true);
    toast.success('Account created successfully!');
  } catch (error) {
    console.error('Auth error:', error);
    const errorMsg = error.response?.data?.detail || 'Registration failed';
    toast.error(errorMsg);
    setLoading(false);
  }
};

const handleDisclaimerDecline = () => {
  setShowDisclaimerModal(false);
  toast.info('You must accept the disclaimer to create an account');
};
```

**CHANGE 4 - Add DisclaimerModal component:**

At the **end of the return statement**, BEFORE the final closing tags `</div>`, ADD:

```javascript
      {/* Disclaimer Modal for Registration */}
      <DisclaimerModal
        open={showDisclaimerModal}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />
```

**Save the file!**

---

### 4.2 Update `frontend\src\context\AuthContext.js`

**Open:** `D:\investment_framework_build\frontend\src\context\AuthContext.js`

**FIND** the register function (around line 95):
```javascript
const register = async (email, password, name) => {
  try {
    const response = await axios.post(
      `${API}/auth/register`,
      { email, password, name },
      { withCredentials: true }
    );
```

**REPLACE with:**
```javascript
const register = async (email, password, name, disclaimerAccepted = false) => {
  try {
    const response = await axios.post(
      `${API}/auth/register`,
      { email, password, name, disclaimer_accepted: disclaimerAccepted },
      { withCredentials: true }
    );
```

**Save the file!**

---

### 4.3 Update `frontend\src\App.js`

**Open:** `D:\investment_framework_build\frontend\src\App.js`

**CHANGE 1 - Add import:**

FIND (around line 21-24):
```javascript
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ProfileSettings from "@/pages/ProfileSettings";
import Layout from "@/components/Layout";
```

ADD this import:
```javascript
import Disclaimer from "@/pages/Disclaimer";
```

**CHANGE 2 - Add route:**

FIND (around line 57-59):
```javascript
<Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route
```

ADD this route:
```javascript
  <Route path="/disclaimer" element={<Disclaimer />} />
```

So it becomes:
```javascript
<Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/disclaimer" element={<Disclaimer />} />
  <Route
```

**Save the file!**

---

## STEP 5: Install Frontend Dependencies & Restart

1. **Stop both servers** (Ctrl+C in both Anaconda Prompts)

2. **In frontend terminal:**
   ```
   cd D:\investment_framework_build\frontend
   npm install
   ```

3. **Restart Backend:**
   ```
   cd D:\investment_framework_build\backend
   python -m uvicorn server:app --reload --port 8000
   ```

4. **Restart Frontend:**
   ```
   cd D:\investment_framework_build\frontend
   npm start
   ```

---

## STEP 6: Test the Disclaimer

1. Open browser to `http://localhost:3000`
2. Click "Sign Up" / "Create Account"
3. Fill in registration form
4. Click "Create Account"
5. **Disclaimer modal should appear!** 🎉
6. Scroll to bottom
7. Check the box
8. Click "I Accept & Continue"
9. You should be registered!

---

## Troubleshooting

### Error: "SECRET_KEY environment variable is not set"
- Make sure you created `backend\.env` file (not .env.txt)
- Make sure you generated and added the SECRET_KEY

### Error: "Module not found: DisclaimerModal"
- Make sure you created all 3 new files in `frontend\src\components\` and `frontend\src\pages\`
- Run `npm install` in frontend folder
- Restart frontend server

### Disclaimer modal doesn't appear
- Check browser console (F12) for errors
- Make sure all frontend files are updated and saved
- Clear browser cache and reload

---

## Summary of Changes

✅ Backend:
- auth_utils.py (SECRET_KEY + disclaimer fields)
- server.py (disclaimer validation)

✅ Frontend:
- DisclaimerText.jsx (NEW)
- DisclaimerModal.jsx (NEW)
- Disclaimer.jsx (NEW)
- Auth.jsx (integrated modal)
- AuthContext.js (pass disclaimer flag)
- App.js (added route)

✅ Configuration:
- backend\.env (NEW - with SECRET_KEY)

---

Need help? Check the error messages and refer back to this guide!
