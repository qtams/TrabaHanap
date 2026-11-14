import api from './client.js'

const data = (r) => r.data

export const listSources = () => api.get('/job-sources').then(data)
// Returns { search, jobs, notes }.
export const searchJobs = (params) => api.post('/job-search', params).then(data)

export const listSearches = () => api.get('/job-searches').then(data)
export const getSearch = (id) => api.get(`/job-searches/${id}`).then(data) // { search, jobs }
export const nameSearch = (id, name) => api.patch(`/job-searches/${id}`, { name }).then(data) // name null = unsave
export const deleteSearch = (id) => api.delete(`/job-searches/${id}`)

export const listJobs = ({ saved = false } = {}) => api.get('/jobs', { params: saved ? { saved: 1 } : {} }).then(data)
export const saveJob = (id) => api.post(`/jobs/${id}/save`).then(data)
export const unsaveJob = (id) => api.delete(`/jobs/${id}/save`).then(data)

// AI actions (10-60 seconds each). Each returns the updated job.
export const analyzeJob = (id) => api.post(`/jobs/${id}/analyze`).then(data)
export const checkCompatibility = (id) => api.post(`/jobs/${id}/compatibility`).then(data)
export const compareWithResume = (id, resumeId) => api.post(`/jobs/${id}/compare`, { resume_id: resumeId }).then(data)
