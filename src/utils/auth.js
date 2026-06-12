export const AUTH_TOKEN_KEY = "kab_auth_token";
export const AUTH_USER_KEY = "kab_auth_user";

export function saveSession({ token, user }) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || {}));
  window.dispatchEvent(new Event("kab-auth-change"));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event("kab-auth-change"));
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
