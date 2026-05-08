#!/bin/bash

# Quick Test Script for OTP Auto-Fill
echo "🚀 Starting OTP Auto-Fill Quick Test"
echo ""

# Check if extension builds
echo "📦 Checking extension build..."
cd chrome-extension
if npm run build > /dev/null 2>&1; then
    echo "✅ Extension builds successfully"
else
    echo "❌ Extension build failed"
    exit 1
fi

# Check if Android app builds
echo "📱 Checking Android app build..."
cd ../mobile/android
if ./gradlew assembleDebug > /dev/null 2>&1; then
    echo "✅ Android app builds successfully"
else
    echo "❌ Android app build failed"
    exit 1
fi

# Start extension development server
echo "🌐 Starting extension development server..."
cd ../../chrome-extension
npm run dev &
EXTENSION_PID=$!

echo "⏳ Waiting 3 seconds for extension to start..."
sleep 3

# Check if WebSocket server is running
if lsof -i :8765 > /dev/null 2>&1; then
    echo "✅ WebSocket server is running on port 8765"
else
    echo "⚠️  WebSocket server not detected on port 8765"
fi

echo ""
echo "🎯 Quick Test Complete!"
echo ""
echo "Next steps:"
echo "1. Load extension in Chrome: chrome://extensions/ → Load unpacked → select chrome-extension/dist"
echo "2. Start Android app: adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk"
echo "3. Pair devices using QR codes"
echo "4. Test OTP flow with real SMS"
echo ""
echo "📚 For detailed testing, see LOCAL_TESTING.md"
