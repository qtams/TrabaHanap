import axios from 'axios'

// One configured client for every call to the Laravel API.
// In dev, Vite proxies /api to Laravel; in production set VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { Accept: 'application/json' },
  withCredentials: true, // send the session cookie
  withXSRFToken: true, // send XSRF-TOKEN cookie back as X-XSRF-TOKEN header
})

export default api

// Signed out or session expired: tell the app (AuthProvider), which shows the login page.
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !error.config.url.endsWith('/me')) window.dispatchEvent(new Event('auth:expired'))
  return Promise.reject(error)
})
