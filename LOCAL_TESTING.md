# Local Testing Guide

## Prerequisites

### Android Phone Setup
1. **Enable Developer Options**
   - Go to Settings → About phone → Tap "Build number" 7 times
   - Enable "USB debugging" in Developer options

2. **Install ADB** (if not already installed)
   ```bash
   brew install android-platform-tools
   ```

3. **Verify Connection**
   ```bash
   adb devices
   ```
   Your phone should appear in the list

### Chrome Extension Setup
1. **Load Extension in Developer Mode**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select `chrome-extension/dist` folder
   - Click "Load"

2. **Verify Extension**
   - Extension should appear in Chrome toolbar
   - Click extension icon → Should show popup

## Testing Workflow

### Step 1: Start WebSocket Server
```bash
# Navigate to extension directory
cd chrome-extension

# Build extension (development mode)
npm run build

# Start extension in development mode
npm run dev
```

### Step 2: Pair Your Phone
1. **Open Extension Popup**
   - Click OTP Auto-Fill icon in Chrome toolbar
   - Click "Pair New Device"

2. **Generate QR Code**
   - Extension will show QR code and pairing code
   - Note the pairing code (6-8 characters)

3. **Open Mobile App**
   - Launch the Android app (if built)
   - Or use the APK from `mobile/android/app/build/outputs/apk/debug/`

4. **Scan QR Code**
   - In mobile app, select "Scan QR Code"
   - Point camera at the QR code shown in extension popup

5. **Complete Pairing**
   - Mobile app should show "Connected" status
   - Extension should show "1 device(s) connected"

### Step 3: Test OTP Detection
1. **Send Test OTP**
   - Use another phone or ask a friend to send test OTP SMS
   - Format: "Your OTP is 123456"

2. **Verify Detection**
   - Mobile app should detect and process the OTP
   - Extension should show notification: "OTP received"

3. **Test Auto-Fill**
   - Open any website with OTP field (e.g., gmail.com, bank login)
   - OTP should appear in extension popup
   - Click "Fill OTP" or click on OTP field
   - OTP should be automatically filled

### Step 4: Test Real Communication
1. **Open Browser Console**
   - Right-click extension icon → "Inspect popup"
   - Go to Console tab

2. **Send Test OTP**
   - Mobile app sends OTP via WebSocket
   - Console should show logs:
     ```
     WebSocket connection established
     OTP received: 123456
     Broadcasting to content scripts
     ```

3. **Check Network Tab**
   - Console → Network tab
   - Should see WebSocket connection to `ws://localhost:8765`

## Troubleshooting

### Common Issues & Solutions

**Issue: Extension not loading**
- **Solution**: Check Chrome developer mode is enabled
- **Solution**: Verify `manifest.json` syntax
- **Solution**: Check Chrome console for errors

**Issue: WebSocket connection failed**
- **Solution**: Check if port 8765 is available
- **Solution**: Verify firewall is not blocking localhost
- **Solution**: Restart extension: `chrome://extensions/ → Reload`

**Issue: OTP not detected**
- **Solution**: Check SMS permissions on Android
- **Solution**: Verify sender number matches known patterns
- **Solution**: Check OTP parser regex patterns

**Issue: Auto-fill not working**
- **Solution**: Check if website uses standard OTP input fields
- **Solution**: Verify content script is injected
- **Solution**: Check browser console for JavaScript errors

## Advanced Testing

### Test Multiple OTP Formats
```bash
# Test different OTP patterns
echo "Your OTP is 1234" | sms send YOUR_PHONE_NUMBER
echo "Your verification code: 567890" | sms send YOUR_PHONE_NUMBER
echo "Enter 987654 to verify" | sms send YOUR_PHONE_NUMBER
```

### Test Security Features
1. **Encryption Verification**
   - Send OTP and verify it's encrypted in transit
   - Check console logs for encryption/decryption messages

2. **Device Authentication**
   - Try pairing with wrong QR code
   - Verify authentication fails gracefully
   - Test device removal and re-pairing

3. **Performance Testing**
   - Monitor extension memory usage
   - Test with multiple tabs open
   - Verify WebSocket connection stability

## Manual Build & Install

### Build Extension
```bash
cd chrome-extension
npm run build
```

### Build Android App
```bash
cd mobile/android
./gradlew assembleDebug
```

### Install Android APK
```bash
# Install debug APK
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Grant permissions when prompted
# SMS, Network, Storage
```

## Production Readiness Checklist

### Chrome Extension
- [ ] All tests passing
- [ ] No console errors
- [ ] WebSocket server starts correctly
- [ ] QR code generation works
- [ ] Auto-fill works on test sites

### Android App
- [ ] APK builds without errors
- [ ] SMS receiver works
- [ ] OTP parser detects test messages
- [ ] WebSocket connection to browser works
- [ ] Permissions requested correctly

### Integration
- [ ] End-to-end OTP flow works
- [ ] Multiple device support
- [ ] Error handling is robust
- [ ] Performance is acceptable

## Next Steps

1. **Fix any issues** found during testing
2. **Add more test cases** for edge cases
3. **Optimize performance** for production
4. **Prepare store submissions** (Chrome Web Store, Google Play)
5. **Set up analytics** for production monitoring

## Support

If you encounter issues:
1. **Check Chrome Console**: `chrome://extensions/ → Inspect → Console`
2. **Check Android Logs**: `adb logcat`
3. **Review Network Tab**: WebSocket connection status
4. **Test with Different Browsers**: Firefox, Edge compatibility
5. **File Issues**: Create GitHub issues with detailed logs

Happy testing! 🚀
