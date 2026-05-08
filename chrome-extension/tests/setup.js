/**
 * Jest setup file for OTP Auto-Fill extension tests
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn()
  },
  contextMenus: {
    create: jest.fn(),
    remove: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  action: {
    openPopup: jest.fn()
  }
};

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  OPEN: 1,
  CONNECTING: 0,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock crypto for Web Crypto API
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    digest: jest.fn(),
    generateKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn()
  }
};

// Mock DOM APIs
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    hostname: 'localhost',
    port: '3000'
  },
  writable: true
});

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup test DOM
document.body.innerHTML = `
  <div id="test-root">
    <input type="text" id="otp-input" name="otp" placeholder="Enter OTP" />
    <input type="password" id="password-input" name="password" />
    <form id="test-form">
      <input type="text" name="verification_code" placeholder="Verification Code" />
      <button type="submit">Submit</button>
    </form>
  </div>
`;

// Helper function to wait for async operations
global.waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to mock Chrome storage responses
global.mockChromeStorage = (data = {}) => {
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = {};
    if (typeof keys === 'string') {
      result[keys] = data[keys] !== undefined ? data[keys] : {};
    } else if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = data[key] !== undefined ? data[key] : {};
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = data[key] !== undefined ? data[key] : keys[key];
      });
    }
    
    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  });

  chrome.storage.local.set.mockImplementation((items, callback) => {
    Object.keys(items).forEach(key => {
      if (key === 'otp_autofill_data') {
        data[key] = { ...data[key], ...items[key] };
      } else {
        data[key] = items[key];
      }
    });
    if (callback) callback();
    return Promise.resolve();
  });

  chrome.storage.local.remove.mockImplementation((keys, callback) => {
    if (Array.isArray(keys)) {
      keys.forEach(key => delete data[key]);
    } else {
      delete data[keys];
    }
    if (callback) callback();
    return Promise.resolve();
  });
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Chrome storage mock
  global.mockChromeStorage();
  
  // Reset DOM
  document.body.innerHTML = `
    <div id="test-root">
      <input type="text" id="otp-input" name="otp" placeholder="Enter OTP" />
      <input type="password" id="password-input" name="password" />
      <form id="test-form">
        <input type="text" name="verification_code" placeholder="Verification Code" />
        <button type="submit">Submit</button>
      </form>
    </div>
  `;
});
