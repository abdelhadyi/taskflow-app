import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/users/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/users/login', data),
  me: () => api.get('/users/me'),
  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.put('/users/me', data),
  listUsers: () => api.get('/users/'),
}

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/projects/'),
  get: (id: number) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/projects/', data),
  update: (id: number, data: Partial<{ name: string; description: string; color: string; status: string }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  getMembers: (id: number) => api.get(`/projects/${id}/members`),
  addMember: (id: number, data: { user_id: number; role: string }) =>
    api.post(`/projects/${id}/members`, data),
  removeMember: (projectId: number, userId: number) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (projectId: number, params?: { status?: string; assignee_id?: number }) =>
    api.get('/tasks/', { params: { project_id: projectId, ...params } }),
  get: (id: number) => api.get(`/tasks/${id}`),
  create: (data: {
    project_id: number; title: string; description?: string
    priority?: string; assignee_id?: number; due_date?: string
  }) => api.post('/tasks/', data),
  update: (id: number, data: Partial<{
    title: string; description: string; status: string
    priority: string; assignee_id: number; due_date: string
  }>) => api.put(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  getComments: (id: number) => api.get(`/tasks/${id}/comments`),
  addComment: (id: number, content: string) =>
    api.post(`/tasks/${id}/comments`, { content }),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get('/notifications/', { params: { unread_only: unreadOnly } }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: number) => api.delete(`/notifications/${id}`),
}
