# OTP Auto-Fill Chrome Extension

A secure Chrome extension that captures OTPs from your mobile phone and automatically fills them into web forms.

## Project Structure

```
otp-autofill/
├── mobile/                    # Mobile applications
│   ├── android/              # Android app (Kotlin)
│   └── ios/                  # iOS app (Swift)
├── extension/                # Chrome extension
│   ├── src/
│   ├── dist/
│   └── tests/
├── shared/                   # Shared utilities and protocols
├── docs/                     # Documentation
├── .github/                  # GitHub workflows
└── scripts/                  # Build and deployment scripts
```

## Features

- 🔒 **Secure**: End-to-end encryption between phone and browser
- 🚀 **Fast**: Real-time OTP detection and auto-fill
- 🔐 **Privacy-focused**: No cloud storage, local processing only
- 📱 **Cross-platform**: Android and iOS support
- 🌐 **Universal**: Works with all websites

## Security

- AES-256 encryption for all data transmission
- Local-only OTP processing
- Device pairing with cryptographic keys
- No data stored on external servers

## Quick Start

### Prerequisites

- Node.js 16+
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/otp-autofill.git
cd otp-autofill
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build:extension
```

4. Load the extension in Chrome
   - Open Chrome Extensions page
   - Enable Developer mode
   - Load unpacked extension from `extension/dist`

## Development

### Chrome Extension
```bash
cd extension
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run test         # Run tests
```

### Android App
```bash
cd mobile/android
./gradlew assembleDebug    # Build debug APK
./gradlew test            # Run tests
```

### iOS App
```bash
cd mobile/ios
xcodebuild -workspace OTPAutoFill.xcworkspace -scheme OTPAutoFill -destination 'platform=iOS Simulator,name=iPhone 14' build
```

## Testing

```bash
npm run test:all          # Run all tests
npm run test:extension    # Extension tests only
npm run test:mobile       # Mobile app tests only
npm run test:e2e          # End-to-end tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Security Disclosure

If you discover a security vulnerability, please report it privately to security@otp-autofill.com before disclosing it publicly.
