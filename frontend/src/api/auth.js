import axios from 'axios'
import api from './client.js'

// Sanctum SPA sign-in: get the CSRF cookie first, then post the credentials (session cookie).
const csrf = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true })

export const me = () => api.get('/me').then((r) => r.data)
export const login = async (login, password, remember) => {
  await csrf()
  return api.post('/login', { login, password, remember }).then((r) => r.data)
}
export const logout = () => api.post('/logout')
// "My account": { name, username, email, password?, password_confirmation?, current_password? }.
export const updateMe = (data) => api.put('/me', data).then((r) => r.data)
