const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const AUTH_STORAGE_KEY = "student-os-auth";

function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAuth(payload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function refreshAccessToken() {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: auth.refreshToken })
  });

  if (!response.ok) {
    throw new Error("Refresh token invalid");
  }

  const data = await response.json();
  setStoredAuth({
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    source: "api"
  });
  return data.accessToken;
}

async function request(path, options = {}, allowRetry = true) {
  const auth = getStoredAuth();
  const token = auth?.accessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && allowRetry && token) {
      try {
        await refreshAccessToken();
        return request(path, options, false);
      } catch {
        clearStoredAuth();
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const apiClient = {
  get: (path, headers = {}) => request(path, { method: "GET", headers }),
  post: (path, body = {}, headers = {}) =>
    request(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    }),
  patch: (path, body = {}, headers = {}) =>
    request(path, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body)
    }),
  delete: (path, headers = {}) =>
    request(path, { method: "DELETE", headers }),
  setStoredAuth,
  clearStoredAuth
};
