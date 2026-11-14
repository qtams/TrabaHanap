import api from './client.js'

const form = (fields) => {
  const body = new FormData()
  Object.entries(fields).forEach(([k, v]) => body.append(k, v))
  return body
}

export const listResumes = () => api.get('/resumes').then((r) => r.data)
export const uploadResume = (title, file) => api.post('/resumes', form({ title, file })).then((r) => r.data)
export const renameResume = (id, title) => api.put(`/resumes/${id}`, { title }).then((r) => r.data)
export const replaceResumeFile = (id, file) => api.post(`/resumes/${id}/file`, form({ file })).then((r) => r.data)
export const deleteResume = (id) => api.delete(`/resumes/${id}`)

// AI steps: each takes 10-60 seconds.
export const extractResume = (id) => api.post(`/resumes/${id}/extract`).then((r) => r.data)
export const analyzeResume = (id) => api.post(`/resumes/${id}/analyze`).then((r) => r.data)
export const tailorResume = (id, job_title, job_description) =>
  api.post(`/resumes/${id}/tailor`, { job_title, job_description }).then((r) => r.data)

// Same-origin URLs (Vite proxies /api), usable directly in <iframe> and <a href>.
const base = import.meta.env.VITE_API_URL ?? '/api'
export const resumeFileUrl = (id) => `${base}/resumes/${id}/file`
export const resumeDownloadUrl = (id) => `${base}/resumes/${id}/file?download=1`
export const fetchResumeFile = (id) => api.get(`/resumes/${id}/file`, { responseType: 'blob' }).then((r) => r.data)

// Laravel error → one readable line.
export function errorMessage(err) {
  const errors = err.response?.data?.errors
  if (errors) return Object.values(errors)[0][0]
  if (!err.response) return 'Cannot reach the server. Is php artisan serve running?'
  return err.response.data?.message || 'Something went wrong. Please try again.'
}
