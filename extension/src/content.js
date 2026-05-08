/**
 * Content Script for OTP Auto-Fill Extension
 * Handles form detection, OTP field highlighting, and auto-filling
 */

class OTPContentScript {
  constructor() {
    this.otpData = null;
    this.activeOTPFields = [];
    this.floatingUI = null;
    
    this.initialize();
  }

  initialize() {
    console.log('OTP Auto-Fill content script initialized');
    
    // Setup message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Scan for OTP fields
    this.scanForOTPFields();
    
    // Setup mutation observer for dynamic content
    this.setupMutationObserver();
    
    // Setup form submission tracking
    this.setupFormTracking();
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'otp_received':
        this.handleOTPReceived(message.data);
        sendResponse({ success: true });
        break;
        
      case 'fill_otp':
        this.fillOTPIntoField(message.otpCode, message.fieldId);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  handleOTPReceived(otpData) {
    this.otpData = otpData;
    console.log('OTP received:', otpData);
    
    // Show floating UI
    this.showFloatingUI(otpData);
    
    // Highlight OTP fields
    this.highlightOTPFields();
    
    // Auto-fill if only one OTP field found
    if (this.activeOTPFields.length === 1) {
      this.autoFillOTP(otpData.code);
    }
  }

  scanForOTPFields() {
    this.activeOTPFields = [];
    
    // Common OTP field selectors
    const otpSelectors = [
      'input[type="text"][name*="otp"]',
      'input[type="text"][id*="otp"]',
      'input[type="text"][placeholder*="otp"]',
      'input[type="text"][name*="verification"]',
      'input[type="text"][id*="verification"]',
      'input[type="text"][placeholder*="verification"]',
      'input[type="text"][name*="code"]',
      'input[type="text"][id*="code"]',
      'input[type="text"][placeholder*="code"]',
      'input[type="password"][name*="otp"]',
      'input[type="password"][id*="otp"]',
      'input[type="password"][placeholder*="otp"]',
      'input[type="number"][maxlength="4"]',
      'input[type="number"][maxlength="6"]',
      'input[type="text"][maxlength="4"]',
      'input[type="text"][maxlength="6"]',
      'input[type="tel"][maxlength="4"]',
      'input[type="tel"][maxlength="6"]',
      // Common patterns
      'input[autocomplete="one-time-code"]',
      '[data-testid*="otp"]',
      '[data-testid*="verification"]',
      '[data-testid*="code"]'
    ];

    otpSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isValidOTPField(element)) {
            this.activeOTPFields.push({
              element,
              id: this.generateFieldId(element),
              confidence: this.calculateFieldConfidence(element)
            });
          }
        });
      } catch (error) {
        console.warn('Error with selector:', selector, error);
      }
    });

    // Sort by confidence
    this.activeOTPFields.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`Found ${this.activeOTPFields.length} potential OTP fields`);
  }

  isValidOTPField(element) {
    // Check if element is visible and enabled
    if (!this.isVisible(element) || element.disabled || element.readOnly) {
      return false;
    }

    // Check if it's likely an OTP field based on attributes
    const id = (element.id || '').toLowerCase();
    const name = (element.name || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();
    const className = (element.className || '').toLowerCase();
    const autocomplete = element.autocomplete || '';

    const otpKeywords = ['otp', 'code', 'verification', 'verify', 'pin', 'auth', 'secure'];
    const hasOTPKeyword = [...otpKeywords].some(keyword => 
      id.includes(keyword) || 
      name.includes(keyword) || 
      placeholder.includes(keyword) || 
      className.includes(keyword)
    );

    // Check for OTP-specific attributes
    const hasOTPAutocomplete = autocomplete === 'one-time-code';
    const hasOTPLength = element.maxLength >= 4 && element.maxLength <= 8;
    const hasNumberType = element.type === 'number' || element.type === 'tel';

    return hasOTPKeyword || hasOTPAutocomplete || (hasOTPLength && hasNumberType);
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  calculateFieldConfidence(element) {
    let confidence = 0.5; // Base confidence

    const id = (element.id || '').toLowerCase();
    const name = (element.name || '').toLowerCase();
    const placeholder = (element.placeholder || '').toLowerCase();
    const autocomplete = element.autocomplete || '';

    // Strong indicators
    if (autocomplete === 'one-time-code') confidence += 0.3;
    if (id.includes('otp') || name.includes('otp')) confidence += 0.2;

    // Medium indicators
    if (placeholder.includes('otp') || placeholder.includes('code')) confidence += 0.15;
    if (element.maxLength >= 4 && element.maxLength <= 8) confidence += 0.1;

    // Weak indicators
    if (element.type === 'number' || element.type === 'tel') confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  generateFieldId(element) {
    return `otp-field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  highlightOTPFields() {
    this.activeOTPFields.forEach(field => {
      field.element.classList.add('otp-autofill-highlight');
      
      // Add click handler
      field.element.addEventListener('click', (e) => {
        if (this.otpData) {
          e.preventDefault();
          this.fillOTPIntoField(this.otpData.code, field.id);
        }
      });
    });
  }

  showFloatingUI(otpData) {
    // Remove existing floating UI
    if (this.floatingUI) {
      this.floatingUI.remove();
    }

    // Create floating UI
    this.floatingUI = document.createElement('div');
    this.floatingUI.className = 'otp-autofill-floating-ui';
    this.floatingUI.innerHTML = `
      <div class="otp-autofill-content">
        <div class="otp-autofill-header">
          <span class="otp-autofill-title">OTP Available</span>
          <button class="otp-autofill-close" title="Close">×</button>
        </div>
        <div class="otp-autofill-body">
          <div class="otp-info">
            <span class="otp-sender">${otpData.sender}</span>
            <span class="otp-code">${otpData.code}</span>
          </div>
          <div class="otp-actions">
            <button class="otp-fill-btn" data-otp="${otpData.code}">
              Fill OTP
            </button>
            <button class="otp-copy-btn" data-otp="${otpData.code}">
              Copy
            </button>
          </div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(this.floatingUI);

    // Setup event handlers
    this.setupFloatingUIHandlers(otpData);

    // Auto-hide after 30 seconds
    setTimeout(() => {
      if (this.floatingUI) {
        this.floatingUI.remove();
        this.floatingUI = null;
      }
    }, 30000);
  }

  setupFloatingUIHandlers(otpData) {
    // Close button
    const closeBtn = this.floatingUI.querySelector('.otp-autofill-close');
    closeBtn.addEventListener('click', () => {
      this.floatingUI.remove();
      this.floatingUI = null;
    });

    // Fill button
    const fillBtn = this.floatingUI.querySelector('.otp-fill-btn');
    fillBtn.addEventListener('click', () => {
      this.autoFillOTP(otpData.code);
      this.floatingUI.remove();
      this.floatingUI = null;
    });

    // Copy button
    const copyBtn = this.floatingUI.querySelector('.otp-copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(otpData.code).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      });
    });
  }

  autoFillOTP(otpCode) {
    if (this.activeOTPFields.length === 1) {
      // Single field - fill directly
      this.fillOTPIntoField(otpCode, this.activeOTPFields[0].id);
    } else if (this.activeOTPFields.length > 1) {
      // Multiple fields - split OTP
      this.splitAndFillOTP(otpCode);
    }
  }

  splitAndFillOTP(otpCode) {
    const digits = otpCode.split('');
    let digitIndex = 0;

    // Fill each field with one digit
    for (const field of this.activeOTPFields) {
      if (digitIndex < digits.length) {
        field.element.value = digits[digitIndex];
        field.element.dispatchEvent(new Event('input', { bubbles: true }));
        field.element.dispatchEvent(new Event('change', { bubbles: true }));
        digitIndex++;
      }
    }

    // Focus on next empty field if any
    const nextEmptyField = this.activeOTPFields.find(field => !field.element.value);
    if (nextEmptyField) {
      nextEmptyField.element.focus();
    }
  }

  fillOTPIntoField(otpCode, fieldId) {
    const field = this.activeOTPFields.find(f => f.id === fieldId);
    if (field) {
      field.element.value = otpCode;
      field.element.dispatchEvent(new Event('input', { bubbles: true }));
      field.element.dispatchEvent(new Event('change', { bubbles: true }));
      field.element.focus();
      
      // Mark OTP as used
      chrome.runtime.sendMessage({
        type: 'use_otp',
        otpId: this.otpData?.id
      });
    }
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if new input elements were added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'INPUT' || node.querySelector('input')) {
                shouldRescan = true;
              }
            }
          });
        }
      });

      if (shouldRescan) {
        setTimeout(() => this.scanForOTPFields(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupFormTracking() {
    // Track form submissions to clean up OTP data
    document.addEventListener('submit', (event) => {
      if (this.otpData) {
        chrome.runtime.sendMessage({
          type: 'use_otp',
          otpId: this.otpData.id
        });
        this.otpData = null;
      }
    });
  }
}

// Initialize the content script
const otpContentScript = new OTPContentScript();
