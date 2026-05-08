# Local Personal-Use Setup Guide (Chrome + Android)

This guide is for getting this project functional for your own day-to-day use, without publishing to any store.

## 0) Reality Check (Current Project Status)

Right now, the repo is a working **prototype**, not a complete app:

- Extension popup/content/background exist and mostly work.
- Android has OTP parser + receiver + WebSocket manager skeleton.
- End-to-end flow is not fully wired yet.

Major gaps you must close first:

1. Missing Android classes referenced by manifest and services:
   - `OTPApplication`
   - `ui/MainActivity`
   - `service/WebSocketService`
   - repositories and encryption classes referenced by `OTPProcessingService`
2. Message contract mismatch between Android and extension auth.
3. Crypto contract mismatch in extension (`decrypt()` usage vs return shape).
4. Popup/options send some message types that background does not handle.
5. Pairing UI shows placeholder QR text (no real QR image yet).

Use the phases below in order.

---

## 1) Basic Machine Setup

### 1.1 Install base tools (macOS)

```bash
brew install node
brew install android-platform-tools
```

Check versions:

```bash
node -v
npm -v
adb version
```

### 1.2 Android phone setup

1. Enable Developer Options (tap Build Number 7 times).
2. Enable USB debugging.
3. Connect phone with USB.
4. Verify:

```bash
adb devices
```

Expected: your device appears as `device` (not `unauthorized`).

---

## 2) Build and Load Chrome Extension

### 2.1 Install extension dependencies

```bash
cd chrome-extension
npm install
```

### 2.2 Build extension

```bash
npm run build
```

### 2.3 Load in Chrome

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select: `chrome-extension/dist`
5. Pin extension to toolbar and open popup

### 2.4 Verify extension runtime

1. In `chrome://extensions/`, open details for this extension.
2. Click **service worker** inspect.
3. Confirm logs show startup and WebSocket port selection.
4. In extension popup, verify UI loads correctly.

---

## 3) Make Android App Buildable (Required Before Integration)

The Android app currently cannot be used as-is for personal daily use. Fix these first:

1. Add missing app entry classes:
   - `OTPApplication`
   - `MainActivity`
   - `WebSocketService`
2. Either:
   - implement missing repositories/utilities used by `OTPProcessingService`, or
   - simplify `OTPProcessingService` to remove those dependencies.
3. Fix `SmsReceiver` imports and compile issues (`Telephony` usage).
4. Ensure app requests and handles runtime permissions:
   - SMS permissions
   - notification permission on Android 13+

Then build:

```bash
cd mobile/android
./gradlew clean
./gradlew assembleDebug
```

Install APK:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 4) Make Pairing/Auth Contract Match

Before testing real OTP transfer, align Android and extension message formats.

### 4.1 Extension currently expects auth message like:

```json
{
  "type": "auth",
  "token": "<base64 json>",
  "deviceInfo": {
    "name": "My Pixel",
    "type": "mobile",
    "platform": "android"
  }
}
```

### 4.2 Android currently sends auth without `deviceInfo`

Update Android `WebSocketManager.createAuthMessage()` so it includes `deviceInfo`.

### 4.3 Ensure token format matches extension verification

`DeviceManager.authenticateDevice()` expects token payload with:
- `pairingCode`
- `signature` (HMAC of serialized `deviceInfo` with pairing secret)

Your Android pairing/token generation must produce exactly this.

---

## 5) Fix OTP Decryption/Data Contract

In extension background:

- `CryptoUtils.decrypt()` returns `{ success, data }`
- current code treats return as plain string

Fix `background.js` OTP handling to:
1. read decrypt result object,
2. validate `success`,
3. use `result.data` as OTP code.

Also ensure Android encrypts with the same key/material expected by extension decrypt.

For personal use, you can temporarily bypass encryption during bring-up:
- send plaintext OTP from Android,
- accept plaintext in extension,
- then re-enable encryption once flow is stable.

---

## 6) Bring End-to-End Flow to Green

After phases 3-5:

1. Start extension (loaded in Chrome).
2. Start Android app on phone.
3. Pair device from extension popup.
4. Confirm extension shows device connected.
5. Send test SMS OTP to phone.
6. Confirm:
   - Android logs OTP parsed
   - WebSocket send succeeds
   - extension popup lists OTP
   - OTP autofills into active OTP input field in browser tab

Useful logs:

```bash
adb logcat | rg -i "otp|websocket|sms|error"
```

and extension:
- service worker console
- popup inspect console
- target page console (for content script behavior)

---

## 7) Daily Use Workflow (After Functional)

Once green, this is your normal routine:

1. Connect phone (USB debugging) or ensure same transport method you implemented.
2. Open Chrome and ensure extension is enabled.
3. Verify device shows connected in popup.
4. Keep phone app running in foreground/background service as needed.
5. Use websites normally; OTP should appear and autofill.

If OTP is not appearing:
1. Reload extension.
2. Reconnect device.
3. Check `adb logcat`.
4. Re-pair once.

---

## 8) Personal Reliability Hardening Checklist

Do these before depending on it daily:

- [ ] Auto-reconnect Android WebSocket on network/process drops.
- [ ] Graceful handling when extension service worker restarts.
- [ ] Persist last paired connection details locally on Android.
- [ ] Add a manual "Send test OTP" action in Android app UI.
- [ ] Add "connection health" indicator in extension popup.
- [ ] Add fallback manual OTP insert path (already partially present).
- [ ] Keep OTP retention short (5 min is good).

---

## 9) Suggested Implementation Order (Fastest Path)

1. Make Android compile and launch.
2. Align auth message/token format.
3. Fix extension decrypt handling.
4. Validate OTP appears in popup.
5. Validate content script autofill on 2-3 real websites.
6. Harden reconnect + lifecycle behavior.

---

## 10) Known Non-Goals for Now

Skip these until personal flow is stable:

- Chrome Web Store packaging
- Play Store release
- iOS support
- advanced settings/options page features not wired in background

