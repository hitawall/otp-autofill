/**
 * Popup script for OTP Auto-Fill Extension
 */

document.addEventListener('DOMContentLoaded', async () => {
  initializePopup();
});

async function initializePopup() {
  // Load current data
  await loadOTPs();
  await loadDevices();
  await updateConnectionStatus();
  
  // Setup event listeners
  setupEventListeners();
}

async function loadOTPs() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_available_otps' });
    const otps = response.data || [];
    
    const otpList = document.getElementById('otpList');
    
    if (otps.length === 0) {
      otpList.innerHTML = `
        <div class="empty-state">
          <p>No OTPs available</p>
          <small>OTPs will appear here when received</small>
        </div>
      `;
    } else {
      otpList.innerHTML = otps.map(otp => `
        <div class="otp-item">
          <div class="otp-info">
            <div class="otp-sender">${otp.sender}</div>
            <div class="otp-code">${otp.code}</div>
            <div class="otp-time">${formatTime(otp.timestamp)}</div>
          </div>
          <div class="otp-actions">
            <button class="btn btn-icon" onclick="copyOTP('${otp.code}')" title="Copy">
              📋
            </button>
            <button class="btn btn-icon" onclick="useOTP('${otp.id}')" title="Use">
              ✓
            </button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading OTPs:', error);
  }
}

async function loadDevices() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_connected_devices' });
    const devices = response.data || [];
    
    const deviceList = document.getElementById('deviceList');
    
    if (devices.length === 0) {
      deviceList.innerHTML = `
        <div class="empty-state">
          <p>No devices connected</p>
          <small>Pair your mobile device to get started</small>
        </div>
      `;
    } else {
      deviceList.innerHTML = devices.map(device => `
        <div class="device-item">
          <div class="device-info">
            <div class="device-icon">${getDeviceIcon(device.type)}</div>
            <div class="device-details">
              <div class="device-name">${device.name}</div>
              <div class="device-type">${device.platform}</div>
            </div>
          </div>
          <button class="btn btn-icon" onclick="removeDevice('${device.id}')" title="Remove">
            ×
          </button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading devices:', error);
  }
}

async function updateConnectionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_connected_devices' });
    const devices = response.data || [];
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('.status-text');
    
    if (devices.length > 0) {
      statusDot.classList.add('connected');
      statusText.textContent = `${devices.length} device(s) connected`;
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('Error updating connection status:', error);
  }
}

function setupEventListeners() {
  // Pair device button
  document.getElementById('pairDeviceBtn').addEventListener('click', showPairingModal);
  
  // Manual OTP button
  document.getElementById('manualOtpBtn').addEventListener('click', showManualOTPModal);
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Help and feedback buttons
  document.getElementById('helpBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/your-username/otp-autofill#help' });
  });
  
  document.getElementById('feedbackBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/your-username/otp-autofill/issues' });
  });
  
  // Modal close buttons
  document.getElementById('closePairingModal').addEventListener('click', hidePairingModal);
  document.getElementById('closeManualModal').addEventListener('click', hideManualOTPModal);
  
  // Modal background clicks
  document.getElementById('pairingModal').addEventListener('click', (e) => {
    if (e.target.id === 'pairingModal') hidePairingModal();
  });
  
  document.getElementById('manualOtpModal').addEventListener('click', (e) => {
    if (e.target.id === 'manualOtpModal') hideManualOTPModal();
  });
  
  // Manual OTP form
  document.getElementById('manualOtpForm').addEventListener('submit', handleManualOTPSubmit);
  
  // Download buttons
  document.getElementById('downloadAndroidBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://play.google.com/store/apps/details?id=com.otpautofill' });
  });
  
  document.getElementById('downloadiOSBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://apps.apple.com/app/otp-autofill' });
  });
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

async function generateQRCode() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'pair_device' });
    const pairingData = response.data;
    
    const qrElement = document.getElementById('qrCode');
    qrElement.innerHTML = `
      <div class="qr-placeholder">
        <p>QR Code would be generated here</p>
        <small>Pairing code: ${pairingData.pairingCode}</small>
      </div>
    `;
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
}

function handleManualOTPSubmit(e) {
  e.preventDefault();
  
  const otpCode = document.getElementById('otpCode').value;
  const otpSender = document.getElementById('otpSender').value;
  
  if (otpCode) {
    // Add OTP to storage
    chrome.runtime.sendMessage({
      type: 'add_manual_otp',
      data: {
        code: otpCode,
        sender: otpSender || 'Manual Entry',
        timestamp: Date.now()
      }
    });
    
    hideManualOTPModal();
    loadOTPs();
  }
}

function copyOTP(code) {
  navigator.clipboard.writeText(code).then(() => {
    // Show toast notification
    showToast('OTP copied to clipboard');
  });
}

function useOTP(otpId) {
  chrome.runtime.sendMessage({
    type: 'use_otp',
    otpId: otpId
  });
  
  // Refresh OTP list
  loadOTPs();
  showToast('OTP marked as used');
}

function removeDevice(deviceId) {
  if (confirm('Are you sure you want to remove this device?')) {
    chrome.runtime.sendMessage({
      type: 'remove_device',
      deviceId: deviceId
    });
    
    loadDevices();
    updateConnectionStatus();
  }
}

function getDeviceIcon(type) {
  const icons = {
    'mobile': '📱',
    'tablet': '📱',
    'desktop': '💻'
  };
  return icons[type] || '📱';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} min ago`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} hours ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function showToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .qr-placeholder {
    width: 200px;
    height: 200px;
    border: 2px dashed #ccc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    border-radius: 8px;
  }
  
  .qr-placeholder p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
  }
  
  .qr-placeholder small {
    font-size: 12px;
    color: #999;
  }
`;
document.head.appendChild(style);
