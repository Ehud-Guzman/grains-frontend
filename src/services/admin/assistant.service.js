import api from '../api'

const BASE = '/admin/assistant'

// The admin help assistant. Answers are computed server-side for the signed-in role, so the
// client never decides what someone may do — it only displays what it is told.
export const adminAssistantService = {
  ask: (q) => api.post(`${BASE}/ask`, { q }),
  openTopic: (topicId) => api.post(`${BASE}/ask`, { topicId }),
  topics: () => api.get(`${BASE}/topics`),
  // Superadmin only: what people asked that had no answer.
  unanswered: () => api.get(`${BASE}/unanswered`),
}
