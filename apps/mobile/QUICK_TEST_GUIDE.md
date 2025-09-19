# 🧪 Echo Camera - Quick Test Guide

## 🌐 **Web Testing (Available Now)**

### **Step 1: Open the App**
Open your browser and navigate to:
```
http://localhost:8081
```

### **Step 2: Navigate to Camera Test**
Go to the respond screen to test the camera:
```
http://localhost:8081/respond/test-123
```

### **Step 3: Test Camera Functionality**

#### **A. Location Verification**
1. The app will try to verify your location
2. If you're not near the test location, click **"Enable Testing Mode"**
3. The "Start Camera" button should become active

#### **B. Open Camera**
1. Click **"Start Camera"** button
2. Grant camera permissions when prompted
3. The camera modal should open

#### **C. Verify UI Elements**
Look for these elements in the camera:
- ✅ **"Echo Camera"** title (bold, white)
- ✅ **"Web Camera Mode"** subtitle with 🌐 icon
- ✅ Challenge code (e.g., "ECHO-XXXX")
- ✅ Privacy notice: "Faces will be automatically blurred after upload"
- ✅ White shutter button with blue glow
- ✅ Close (X) button in top-right

#### **D. Capture Photo**
1. Click the **shutter button**
2. You should see processing states:
   - "Capturing Photo..."
   - "Uploading for Processing..."
   - "Applying Privacy Protection..."
3. Note: Server-side processing requires backend to be running

---

## 📱 **Mobile Testing (Development Build Required)**

### **Option 1: Test with Expo Go (Limited Features)**
```bash
# Start for mobile
.\node_modules\.bin\expo start

# Scan QR code with Expo Go app
```
**Note:** Face blurring won't work in Expo Go, but basic camera will.

### **Option 2: Development Build (Full Features)**
```bash
# Android
npx expo run:android

# iOS (Mac required)
npx expo run:ios
```

---

## 🔍 **What to Check**

### **Web Browser Console**
Press F12 to open DevTools and check for:
```javascript
[EchoCameraUnified] Platform detection: { platform: 'web', selectedImplementation: 'Fallback (expo-camera)' }
[EchoCameraWeb] Challenge code fetch failed: // This is normal if backend isn't running
```

### **Expected Behavior - Web**
1. ✅ Camera opens in modal
2. ✅ UI shows web-specific messaging
3. ✅ Capture button works
4. ⚠️ Processing will fail without backend (expected)

### **Expected Behavior - Mobile (Dev Build)**
1. ✅ Full-screen immersive camera
2. ✅ Real-time face blurring visible
3. ✅ Capture includes blurred faces
4. ✅ Performance smooth (30+ FPS)

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: Camera doesn't open**
- **Solution:** Check browser permissions (Settings > Privacy > Camera)
- Ensure using HTTPS or localhost

### **Issue 2: "VisionCamera error" on web**
- **Solution:** This should be fixed with our polyfills
- If still occurs, clear cache: `.\node_modules\.bin\expo start --clear`

### **Issue 3: Processing fails**
- **Expected:** Backend service not running yet
- The UI flow should still work, just won't complete processing

### **Issue 4: Black screen in camera**
- **Solution:** Try different browser (Chrome/Edge recommended)
- Check camera not in use by another app

---

## ✨ **Success Criteria**

### **Minimum (Web - No Backend)**
- [ ] Camera modal opens
- [ ] UI displays correctly
- [ ] Can capture photo (even if processing fails)
- [ ] Close button works

### **Full Test (With Backend)**
- [ ] Photo captures successfully
- [ ] Processing modal shows progress
- [ ] Faces are blurred in final image
- [ ] Success message appears

---

## 🚀 **Quick Commands**

```bash
# Start web server
.\node_modules\.bin\expo start --web

# Clear cache and restart
.\node_modules\.bin\expo start --web --clear

# Check logs
# Press 'j' in terminal for debugger

# Stop server
# Press Ctrl+C
```

---

## 📊 **Performance Targets**

- **Camera Open:** < 2 seconds
- **Permission Grant:** Immediate
- **Photo Capture:** < 1 second
- **UI Responsive:** 60 FPS
- **Memory Usage:** < 200MB additional

---

## 🎯 **Test Complete!**

If all checks pass, the Echo Camera system is working correctly on web.
For full production testing with face blurring, deploy the backend service.