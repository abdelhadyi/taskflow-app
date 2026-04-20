export interface User {
  id: number
  email: string
  full_name: string
  role: string
  avatar_url: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Project {
  id: number
  name: string
  description: string | null
  color: string
  status: string
  owner_id: number
  created_at: string
  updated_at: string
}

export interface Member {
  project_id: number
  user_id: number
  role: string
  joined_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  project_id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee_id: number | null
  creator_id: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  task_id: number
  user_id: number
  content: string
  created_at: string
}

export interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  body: string
  is_read: boolean
  reference_id: number | null
  reference_type: string | null
  created_at: string
}
