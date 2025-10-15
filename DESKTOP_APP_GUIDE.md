# InvestPro - Desktop Application Installation Guide

Since the PWA auto-install icon may not appear (common with localhost/development setups), here are **guaranteed methods** to create a desktop app experience:

---

## 🎯 **Method 1: Chrome Application Shortcut (RECOMMENDED)**

This works on **Windows, Mac, and Linux** and creates a true standalone app.

### Steps:

1. **Open InvestPro in Chrome**
   - Navigate to your app URL (e.g., `http://localhost:3000`)

2. **Create Application Shortcut:**
   - Click the **three dots menu (⋮)** in top-right corner
   - Go to **"More tools"** → **"Create shortcut..."**
   - A dialog will appear

3. **Enable "Open as window":**
   - ✅ **Check the box** "Open as window"
   - Click **"Create"**

4. **Result:**
   - InvestPro will open in its own window (no browser tabs/address bar)
   - Shortcut appears on your Desktop
   - App icon appears in Start Menu/Applications
   - You can pin it to taskbar/dock

---

## 🎯 **Method 2: Edge Application (Windows)**

If you're using Microsoft Edge:

1. Open InvestPro in Edge
2. Click **three dots (...)** → **"Apps"** → **"Install this site as an app"**
3. Click **"Install"**
4. App will open in standalone window

---

## 🎯 **Method 3: Manual Desktop Shortcut**

### **Windows:**

1. **Right-click on Desktop** → **New** → **Shortcut**

2. **Enter this as location:**
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000 --window-size=1400,900
   ```
   
3. **Click Next**, name it **"InvestPro"**

4. **Click Finish**

5. **Change Icon (Optional):**
   - Right-click shortcut → **Properties** → **Change Icon**
   - Browse to any icon you like

### **Mac:**

1. **Open Automator** (Applications → Automator)

2. **Choose "Application"**

3. **Add "Run Shell Script" action**

4. **Paste this code:**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --app=http://localhost:3000 --window-size=1400,900
   ```

5. **Save as "InvestPro"** in Applications folder

6. **Drag to Dock** for quick access

### **Linux:**

1. **Create a desktop file:**
   ```bash
   nano ~/.local/share/applications/investpro.desktop
   ```

2. **Add this content:**
   ```ini
   [Desktop Entry]
   Version=1.0
   Type=Application
   Name=InvestPro
   Comment=Indian Markets Investment Framework
   Exec=google-chrome --app=http://localhost:3000 --window-size=1400,900
   Icon=accessories-calculator
   Terminal=false
   Categories=Office;Finance;
   ```

3. **Save and make executable:**
   ```bash
   chmod +x ~/.local/share/applications/investpro.desktop
   ```

4. **Launch from Applications menu**

---

## 🎯 **Method 4: Bookmark Bar (Quick Access)**

For instant access without installation:

1. **Bookmark the page:**
   - Press `Ctrl+D` (Windows/Linux) or `Cmd+D` (Mac)
   
2. **Save to Bookmarks Bar**

3. **Edit bookmark name** to just "InvestPro" or "📊"

4. **Enable Bookmarks Bar:**
   - Chrome: `Ctrl+Shift+B` / `Cmd+Shift+B`

---

## 🎯 **Method 5: Browser Extension (Optional)**

Use extensions like:
- **Fluid** (Mac) - Creates standalone Mac apps from websites
- **nativefier** (Cross-platform) - CLI tool to create desktop apps

### Using Nativefier (Advanced):

```bash
npm install -g nativefier
nativefier --name "InvestPro" "http://localhost:3000"
```

This creates a standalone executable app.

---

## ✅ **Recommended Setup**

**Best experience:**
1. Use **Method 1** (Chrome "Create shortcut" with "Open as window")
2. Pin the app to your taskbar/dock
3. Keep it running for quick access

**Why this works:**
- ✅ No browser tabs or address bar
- ✅ Own window and icon
- ✅ Separate from browser
- ✅ Can be pinned to taskbar
- ✅ Appears in Alt+Tab / Cmd+Tab
- ✅ Full-screen capable
- ✅ Independent cookies/storage

---

## 🔍 **Verification**

After installation, you should have:
- ✅ Desktop shortcut or Applications menu entry
- ✅ Standalone window when launched
- ✅ No browser UI (address bar, tabs)
- ✅ InvestPro app in taskbar/dock
- ✅ Separate app in task switcher

---

## 🎨 **Customizing the Experience**

### **Add Custom Icon (Windows):**
1. Download an investment/chart icon (PNG or ICO)
2. Right-click shortcut → Properties → Change Icon
3. Browse to your icon file

### **Window Size:**
Edit your shortcut and change `--window-size=1400,900` to your preferred size:
- Full HD: `--window-size=1920,1080`
- Laptop: `--window-size=1366,768`
- Wide: `--window-size=1600,900`

### **Add to Startup (Windows):**
1. Press `Win+R`
2. Type `shell:startup`
3. Copy your InvestPro shortcut here
4. App will launch on startup

---

## 🚀 **Quick Start Commands**

### **Create Windows Shortcut (PowerShell):**
```powershell
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\InvestPro.lnk")
$Shortcut.TargetPath = "chrome.exe"
$Shortcut.Arguments = "--app=http://localhost:3000"
$Shortcut.Save()
```

### **Create Mac App (Terminal):**
```bash
cat > ~/Desktop/InvestPro.command << 'EOF'
#!/bin/bash
open -a "Google Chrome" --args --app=http://localhost:3000
EOF
chmod +x ~/Desktop/InvestPro.command
```

---

## ❓ **Troubleshooting**

### **Shortcut not working?**
- Verify Chrome is installed in default location
- Try replacing `chrome.exe` with full path
- Use `--app=` flag (important!)

### **Want different browser?**
Replace Chrome path with:
- **Edge:** `msedge.exe --app=http://localhost:3000`
- **Brave:** `brave.exe --app=http://localhost:3000`

### **App closes when browser closes?**
This is normal for app-mode shortcuts. They're independent but require browser engine.

---

## 💡 **Pro Tips**

1. **Multiple Windows:** You can open multiple instances of the app
2. **DevTools:** Right-click in app → Inspect (for debugging)
3. **Zoom:** `Ctrl +/-` or `Cmd +/-` to adjust zoom level
4. **Fullscreen:** Press `F11` for full-screen mode
5. **Keyboard Shortcuts:** All browser shortcuts work

---

## 📝 **Summary**

**Easiest Method:** Chrome → Three dots → More tools → Create shortcut → ✅ Open as window

**Most Native:** Use Method 3 (manual shortcut) with custom icon

**Best for Mac:** Method 2 (Automator app)

**Best for Linux:** Method 3 (desktop file)

---

Your InvestPro app will work perfectly as a desktop application using any of these methods! 🎉

For questions or issues, refer to the specific method section above.
