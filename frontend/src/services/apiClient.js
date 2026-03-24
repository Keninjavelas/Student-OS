const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
    })
};
