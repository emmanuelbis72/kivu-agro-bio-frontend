export const AUTH_TOKEN_KEY = "kab_auth_token";
export const AUTH_USER_KEY = "kab_auth_user";
export const AUTH_CHANGE_EVENT = "kab-auth-change";

function notifySessionChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveSession({ token, user }) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || {}));
  notifySessionChange();
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  notifySessionChange();
}

export function getStoredUser() {
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function hasSession() {
  return Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));
}
