// SkillBridge AI Client Configuration

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5001/api/v1`
    : 'http://localhost:5001/api/v1');

export const APP_NAME = 'SkillBridge AI';
export const APP_VERSION = '2.0.0';

export default {
  API_BASE_URL,
  APP_NAME,
  APP_VERSION,
};
