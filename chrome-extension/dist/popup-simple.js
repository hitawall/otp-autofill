/**
 * Simplified Popup script for OTP Auto-Fill Extension
 * Standalone version that works without background script dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

function initializePopup() {
  console.log('OTP Auto-Fill Popup initialized');
  
  // Load initial data
  loadConnectionStatus();
  
  // Setup event listeners
  setupEventListeners();
  
  // Generate initial QR placeholder
  generateQRCode();
}

function loadConnectionStatus() {
  const statusElement = document.getElementById('connectionStatus');
  const statusDot = statusElement.querySelector('.status-dot');
  const statusText = statusElement.querySelector('.status-text');
  
  // For now, show disconnected state
  statusDot.classList.remove('connected');
  statusText.textContent = 'Disconnected';
}

function setupEventListeners() {
  // Pair device button
  document.getElementById('pairDeviceBtn').addEventListener('click', showPairingModal);
  
  // Manual OTP button
  document.getElementById('manualOtpBtn').addEventListener('click', showManualOTPModal);
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage().catch(() => {
      console.log('Options page not available');
    });
  });
  
  // Modal close buttons
  document.getElementById('closePairingModal').addEventListener('click', hidePairingModal);
  document.getElementById('closeManualModal').addEventListener('click', hideManualOTPModal);
  
  // Manual OTP form
  document.getElementById('manualOtpForm').addEventListener('submit', handleManualOTPSubmit);
}

function showPairingModal() {
  const modal = document.getElementById('pairingModal');
  modal.classList.add('show');
  generateQRCode();
}

function hidePairingModal() {
  const modal = document.getElementById('pairingModal');
  modal.classList.remove('show');
}

function showManualOTPModal() {
  const modal = document.getElementById('manualOtpModal');
  modal.classList.add('show');
}

function hideManualOTPModal() {
  const modal = document.getElementById('manualOtpModal');
  modal.classList.remove('show');
  document.getElementById('manualOtpForm').reset();
}

function generateQRCode() {
  try {
    const qrElement = document.getElementById('qrCode');
    const pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create a simple visual QR code representation
    qrElement.innerHTML = `
      <div class="qr-container">
        <div class="qr-visual">
          <div class="qr-pattern">
            ${generateVisualQR()}
          </div>
        </div>
        <div class="pairing-code">
          <strong>Pairing Code:</strong> ${pairingCode}
        </div>
        <div class="qr-instructions">
          <small>Scan with your phone app or enter code manually</small>
        </div>
      </div>
    `;
    
    console.log('QR Code generated:', pairingCode);
  } catch (error) {
    console.error('Error generating QR code:', error);
    const qrElement = document.getElementById('qrCode');
    qrElement.innerHTML = `
      <div class="qr-error">
        <p>⚠️ QR Code Error</p>
        <small>Please reload extension</small>
      </div>
    `;
  }
}

function generateVisualQR() {
  // Generate a simple visual pattern that looks like a QR code
  let pattern = '';
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      const isBlack = Math.random() > 0.5;
      pattern += `<div class="qr-pixel ${isBlack ? 'black' : 'white'}"></div>`;
    }
  }
  return pattern;
}

function handleManualOTPSubmit(e) {
  e.preventDefault();
  
  const otpCode = document.getElementById('otpCode').value;
  const otpSender = document.getElementById('otpSender').value;
  
  if (otpCode) {
    console.log('Manual OTP added:', otpCode, 'from:', otpSender);
    
    // Show success message
    showToast(`OTP ${otpCode} added successfully`);
    
    hideManualOTPModal();
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #667eea;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    animation: fadeIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
  }
  
  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
  }
  
  .qr-visual {
    width: 200px;
    height: 200px;
    border: 3px solid #333;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }
  
  .qr-pattern {
    display: grid;
    grid-template-columns: repeat(25, 1fr);
    grid-template-rows: repeat(25, 1fr);
    width: 100%;
    height: 100%;
  }
  
  .qr-pixel {
    width: 100%;
    height: 100%;
  }
  
  .qr-pixel.black {
    background: #333;
  }
  
  .qr-pixel.white {
    background: white;
  }
  
  .pairing-code {
    font-size: 16px;
    color: #333;
    text-align: center;
  }
  
  .qr-instructions {
    color: #666;
    text-align: center;
  }
  
  .qr-error {
    text-align: center;
    color: #dc3545;
    padding: 20px;
  }
`;
document.head.appendChild(style);

console.log('Popup Simple script loaded successfully');
