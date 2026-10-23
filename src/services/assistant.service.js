import api from './api'

// The help assistants for shoppers and drivers. (The admin one is in services/admin.)
// Each answers from its own catalogue for the person asking: the shop assistant works for
// visitors who are not signed in too, the driver one needs a driver sign-in. The server
// decides what each person may do; the client only shows it.

const make = (base) => ({
  ask: (q) => api.post(`${base}/ask`, { q }),
  openTopic: (topicId) => api.post(`${base}/ask`, { topicId }),
  topics: () => api.get(`${base}/topics`),
})

export const shopAssistantService = make('/help')
export const driverAssistantService = make('/driver/assistant')
