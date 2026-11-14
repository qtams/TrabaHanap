import api from './client.js'

// Users module (admins only).
export const listUsers = () => api.get('/users').then((r) => r.data)
export const createUser = (user) => api.post('/users', user).then((r) => r.data)
export const updateUser = (id, user) => api.put(`/users/${id}`, user).then((r) => r.data)
export const deleteUser = (id) => api.delete(`/users/${id}`)
