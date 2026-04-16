/**
 * WeChat JS SDK integration utility
 * Handles WeChat SDK initialization and location verification
 */

// WeChat JS SDK internal type declarations
interface WXJssdkConfig {
  debug: boolean;
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

interface WXJssdkLocationRes {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
}

interface WXJssdkError {
  errMsg: string;
}

interface WXJssdk {
  config: (config: WXJssdkConfig) => void;
  getLocation: (options: {
    type: string;
    success: (res: WXJssdkLocationRes) => void;
    fail: (err: WXJssdkError) => void;
  }) => void;
  openLocation: (options: object) => void;
  ready: (callback: () => void) => void;
  error: (callback: (err: WXJssdkError) => void) => void;
}

declare global {
  interface Window {
    wx: WXJssdk;
  }
}

export interface WeChatConfigResponse {
  appId: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
}

// Check if running in WeChat browser
export const isInWeChat = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('micromessenger') !== -1;
};

// Load WeChat JS SDK script
export const loadWeChatSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.wx) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load WeChat SDK'));
    document.head.appendChild(script);
  });
};

// Configure WeChat JS SDK
export const configureWeChat = async (config: WeChatConfigResponse): Promise<void> => {
  await loadWeChatSDK();

  if (!window.wx) {
    throw new Error('WeChat SDK not loaded');
  }

  window.wx.config({
    debug: false,
    appId: config.appId,
    timestamp: Number(config.timestamp),
    nonceStr: config.nonceStr,
    signature: config.signature,
    jsApiList: [
      'getLocation',
      'openLocation',
    ],
  });
};

// Get current location via WeChat JS SDK
export const getWeChatLocation = (): Promise<LocationInfo> => {
  return new Promise((resolve, reject) => {
    if (!window.wx) {
      reject(new Error('WeChat SDK not initialized'));
      return;
    }

    window.wx.getLocation({
      type: 'gcj02',
      success: (res: WXJssdkLocationRes) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          speed: res.speed,
          accuracy: res.accuracy,
        });
      },
      fail: (err: WXJssdkError) => {
        reject(new Error(err.errMsg || 'Failed to get location'));
      },
    });
  });
}

// Check if location is within allowed range (in meters)
export const isLocationWithinRange = (
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  maxDistanceMeters: number = 1000
): boolean => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(targetLat - userLat);
  const dLng = toRad(targetLng - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) * Math.cos(toRad(targetLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= maxDistanceMeters;
}
