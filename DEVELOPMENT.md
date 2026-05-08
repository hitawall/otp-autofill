# Development Workflow

## Repository Structure Decision

**Chosen Structure**: Option B (Platform-Specific)
```
otp-autofill/
├── mobile/
│   ├── android/          # Android app (self-contained)
│   └── ios/              # iOS app (self-contained)
├── chrome-extension/       # Chrome extension (self-contained)
├── shared/               # Shared protocols and types
└── docs/                 # Documentation
```

## Git Workflow

### Branch Strategy
- **main**: Production-ready code, protected branch
- **develop**: Integration branch for features
- **feature/***: Individual feature branches
- **hotfix/***: Critical fixes for production

### Protection Rules
- **main branch**: Requires PR review + status checks
- **Only maintainers** can push directly to main
- **All changes** must go through PR process
- **CI/CD must pass** before merge

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/otp-detection-improvement
   ```

2. **Development & Testing**
   - Write code with tests
   - Ensure all tests pass locally
   - Follow coding standards

3. **Create Pull Request**
   ```bash
   git push origin feature/otp-detection-improvement
   # Create PR on GitHub
   ```

4. **Review Process**
   - Automated tests run
   - Code review required
   - Security review for sensitive changes

5. **Merge to Develop**
   - PR approved → merge to develop
   - Integration tests run

6. **Release to Main**
   - Deploy from develop to main
   - Automated release process

## Deployment Strategy

### Environments
- **Staging**: Continuous deployment from develop
- **Production**: Manual deployment from main

### Live Testing Setup

#### Free Tier Options:

**Option 1: GitHub Pages (Recommended)**
```yaml
# Deploy extension demo to GitHub Pages
- Extension demo site
- Test forms for OTP input
- Mobile app testing instructions
```

**Option 2: Netlify/Vercel**
```yaml
# Static hosting for extension demo
- Preview deployments for PRs
- Automated testing
```

**Option 3: Firebase Hosting**
```yaml
# Free tier hosting
- Real-time testing
- Analytics integration
```

### Testing Workflow

1. **Unit Tests**: Run on every PR
2. **Integration Tests**: Run on develop
3. **E2E Tests**: Run on staging
4. **Security Tests**: Run before production
5. **Performance Tests**: Run on production

## Size Optimization

### Mobile App
- **ProGuard/R8**: Code shrinking and obfuscation
- **Resource Optimization**: Compress images and assets
- **Bundle Analysis**: Monitor APK size
- **Split APKs**: By architecture if needed

### Chrome Extension
- **Webpack Optimization**: Tree shaking, minification
- **Code Splitting**: Separate vendor bundles
- **Asset Optimization**: Compress images
- **Manifest V3**: Modern extension standards

## Required Permissions Setup

### GitHub Repository
1. **Branch Protection**: Already configured
2. **Required Status Checks**: CI/CD pipeline
3. **Required Reviewers**: At least 1 maintainer
4. **Restrict Pushes**: Only to develop/feature branches

### Chrome Web Store
- **Developer Account**: $5 one-time fee
- **Permissions**: Active tabs, storage, scripting
- **Security Review**: Required for publishing

### Google Play Store
- **Developer Account**: $25 one-time fee
- **Permissions**: SMS, Internet, Network state
- **Content Rating**: Appropriate for OTP app

### Apple App Store
- **Developer Account**: $99/year
- **Permissions**: Minimal (iOS SMS restrictions)
- **App Review**: Strict guidelines

## Next Steps

1. **Choose directory structure** (recommend Option B)
2. **Create GitHub repository** with current code
3. **Configure branch protection** rules
4. **Set up staging environment** for testing
5. **Plan production deployment** strategy

## Commands for Setup

```bash
# 1. Rename directories (if Option B chosen)
mv mobile-app mobile
mv extension chrome-extension

# 2. Create GitHub repository
gh repo create otp-autofill --public --clone=false
git remote add origin https://github.com/YOUR_USERNAME/otp-autofill.git
git push -u origin main

# 3. Setup branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/ci"]}' \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field enforce_admins=true

# 4. Create develop branch
git checkout -b develop
git push -u origin develop

# 5. Setup staging (choose one)
# Option A: GitHub Pages
gh api repos/:owner/:repo/pages \
  --method POST \
  --field source.branch=develop

# Option B: Netlify
# Connect repo to Netlify for automatic deploys
```
