/**
 * Options page script for OTP Auto-Fill Extension
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initializeOptions();
});

async function initializeOptions() {
  // Load current settings
  await loadSettings();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load device list
  await loadDevices();
}

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_settings' });
    const settings = response.data || {};
    
    // Update form fields
    document.getElementById('autoFill').checked = settings.autoFill !== false;
    document.getElementById('notifications').checked = settings.notifications !== false;
    document.getElementById('expireAfter').value = Math.floor((settings.expireAfter || 300000) / 60000); // Convert to minutes
    
    // Update display
    updateSettingsDisplay(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
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
              <div class="device-status">
                <span class="status-dot ${device.status === 'authenticated' ? 'connected' : ''}"></span>
                ${device.status === 'authenticated' ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
          <div class="device-actions">
            <button class="btn btn-secondary" onclick="renameDevice('${device.id}', '${device.name}')">
              Rename
            </button>
            <button class="btn btn-danger" onclick="removeDevice('${device.id}')">
              Remove
            </button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading devices:', error);
  }
}

function setupEventListeners() {
  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
  
  // Device pairing
  document.getElementById('pairNewDevice').addEventListener('click', showPairingModal);
  
  // Modal close buttons
  document.getElementById('closePairingModal').addEventListener('click', hidePairingModal);
  
  // Modal background click
  document.getElementById('pairingModal').addEventListener('click', (e) => {
    if (e.target.id === 'pairingModal') hidePairingModal();
  });
  
  // Clear data buttons
  document.getElementById('clearOTPs').addEventListener('click', clearOTPs);
  document.getElementById('clearDevices').addEventListener('click', clearDevices);
  document.getElementById('clearAll').addEventListener('click', clearAllData);
  
  // Export/Import
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('change', importData);
  
  // QR code regeneration
  document.getElementById('regenerateQR').addEventListener('click', generateQRCode);
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  
  const settings = {
    autoFill: document.getElementById('autoFill').checked,
    notifications: document.getElementById('notifications').checked,
    expireAfter: parseInt(document.getElementById('expireAfter').value) * 60000 // Convert to milliseconds
  };
  
  try {
    await chrome.runtime.sendMessage({
      type: 'update_settings',
      data: settings
    });
    
    showToast('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings', 'error');
  }
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

async function generateQRCode() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'pair_device' });
    const pairingData = response.data;
    
    const qrElement = document.getElementById('qrCode');
    const pairingCodeElement = document.getElementById('pairingCode');
    
    qrElement.innerHTML = `
      <div class="qr-placeholder">
        <p>QR Code would be generated here</p>
        <small>Pairing code: ${pairingData.pairingCode}</small>
        <small>Expires in: ${Math.floor((pairingData.expiresAt - Date.now()) / 60000)} minutes</small>
      </div>
    `;
    
    pairingCodeElement.textContent = pairingData.pairingCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
  }
}

function renameDevice(deviceId, currentName) {
  const newName = prompt('Enter new device name:', currentName);
  if (newName && newName !== currentName) {
    chrome.runtime.sendMessage({
      type: 'rename_device',
      data: { deviceId, name: newName }
    }).then(() => {
      loadDevices();
      showToast('Device renamed successfully');
    }).catch(error => {
      console.error('Error renaming device:', error);
      showToast('Error renaming device', 'error');
    });
  }
}

function removeDevice(deviceId) {
  if (confirm('Are you sure you want to remove this device? This will require re-pairing to use it again.')) {
    chrome.runtime.sendMessage({
      type: 'remove_device',
      deviceId: deviceId
    }).then(() => {
      loadDevices();
      showToast('Device removed successfully');
    }).catch(error => {
      console.error('Error removing device:', error);
      showToast('Error removing device', 'error');
    });
  }
}

async function clearOTPs() {
  if (confirm('Are you sure you want to clear all OTPs? This cannot be undone.')) {
    try {
      await chrome.runtime.sendMessage({ type: 'clear_otps' });
      showToast('All OTPs cleared');
    } catch (error) {
      console.error('Error clearing OTPs:', error);
      showToast('Error clearing OTPs', 'error');
    }
  }
}

async function clearDevices() {
  if (confirm('Are you sure you want to remove all devices? You will need to re-pair them.')) {
    try {
      await chrome.runtime.sendMessage({ type: 'clear_devices' });
      await loadDevices();
      showToast('All devices removed');
    } catch (error) {
      console.error('Error clearing devices:', error);
      showToast('Error clearing devices', 'error');
    }
  }
}

async function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This will remove all OTPs, devices, and settings. This cannot be undone.')) {
    try {
      await chrome.runtime.sendMessage({ type: 'clear_all_data' });
      await loadSettings();
      await loadDevices();
      showToast('All data cleared');
    } catch (error) {
      console.error('Error clearing all data:', error);
      showToast('Error clearing data', 'error');
    }
  }
}

async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'export_data' });
    const data = response.data;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp-autofill-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
  } catch (error) {
    console.error('Error exporting data:', error);
    showToast('Error exporting data', 'error');
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (confirm('Importing data will overwrite your current data. Are you sure you want to continue?')) {
      await chrome.runtime.sendMessage({
        type: 'import_data',
        data: data
      });
      
      await loadSettings();
      await loadDevices();
      showToast('Data imported successfully');
    }
  } catch (error) {
    console.error('Error importing data:', error);
    showToast('Error importing data. Please check the file format.', 'error');
  }
  
  // Reset file input
  event.target.value = '';
}

function updateSettingsDisplay(settings) {
  // Update status indicators
  const autoFillStatus = document.getElementById('autoFillStatus');
  const notificationsStatus = document.getElementById('notificationsStatus');
  
  autoFillStatus.textContent = settings.autoFill !== false ? 'Enabled' : 'Disabled';
  autoFillStatus.className = settings.autoFill !== false ? 'status-enabled' : 'status-disabled';
  
  notificationsStatus.textContent = settings.notifications !== false ? 'Enabled' : 'Disabled';
  notificationsStatus.className = settings.notifications !== false ? 'status-enabled' : 'status-disabled';
}

function getDeviceIcon(type) {
  const icons = {
    'mobile': '📱',
    'tablet': '📱',
    'desktop': '💻'
  };
  return icons[type] || '📱';
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
  `;
  document.body.appendChild(container);
  return container;
}

// Add toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .toast {
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 8px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .toast-success {
    background: #28a745;
  }
  
  .toast-error {
    background: #dc3545;
  }
  
  .toast-hiding {
    animation: slideOut 0.3s ease;
    opacity: 0;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
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
    margin: 0 auto;
  }
  
  .qr-placeholder p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
  }
  
  .qr-placeholder small {
    font-size: 12px;
    color: #999;
    display: block;
    margin: 4px 0;
  }
  
  .pairing-code {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
    color: #667eea;
    margin: 16px 0;
    padding: 8px 16px;
    background: #f8f9ff;
    border: 1px solid #e9ecef;
    border-radius: 4px;
  }
`;
document.head.appendChild(toastStyles);
