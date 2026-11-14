import api from './client.js'

export const getProfile = () => api.get('/profile').then((r) => r.data)
// syncedResumeId: send after importing from a resume, so the "newer resume" banner clears.
export const saveProfile = (data, syncedResumeId = null) =>
  api.put('/profile', { data, synced_resume_id: syncedResumeId }).then((r) => r.data)
// Claude maps a resume's extracted info to profile fields. Returns { resume_id, data }; nothing is saved.
export const importFromResume = (resumeId) => api.post(`/profile/import/${resumeId}`).then((r) => r.data)
// Claude drafts { introduction, career_objective, career_goals } from the form's data. Nothing is saved.
export const writeSummary = (data) => api.post('/profile/summary', { data }).then((r) => r.data)
