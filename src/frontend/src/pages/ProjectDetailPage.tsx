import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { projectsApi, tasksApi, authApi } from '../api'
import type { Project, Task, TaskStatus, User } from '../types'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review',   label: 'In Review' },
  { status: 'done',        label: 'Done' },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', due_date: '', assignee_id: '',
  })
  const [err, setErr] = useState('')

  const { data: project } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId).then((r) => r.data),
  })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId).then((r) => r.data ?? []),
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers().then((r) => r.data),
  })

  const createTask = useMutation({
    mutationFn: () => tasksApi.create({
      project_id: projectId,
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_date: form.due_date ? form.due_date + 'T00:00:00Z' : undefined,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      setShowModal(false)
      setForm({ title: '', description: '', priority: 'medium', due_date: '', assignee_id: '' })
    },
    onError: (e: any) => setErr(e.response?.data?.error ?? 'Failed'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })

  function tasksByStatus(status: TaskStatus) {
    return (tasks ?? []).filter((t) => t.status === status)
  }

  return (
    <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/projects" style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.875rem' }}>
          <ArrowLeft size={16} /> Projects
        </Link>
        <span style={{ color: 'var(--border-2)' }}>/</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
          {project && <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.color }} />}
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{project?.name ?? '...'}</h1>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add Task
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', flex: 1, minHeight: 0 }}>
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.status)
          return (
            <div key={col.status} style={columnStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
                <span className={`badge badge-${col.status}`}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 600 }}>
                  {colTasks.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', overflowY: 'auto', flex: 1 }}>
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} users={users}
                    onMove={(s) => updateStatus.mutate({ taskId: task.id, status: s })} />
                ))}
                {colTasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem .5rem', color: 'var(--text-3)', fontSize: '.8rem', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>New Task</h2>
            {err && <div style={errBox}>{err}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Title *</label>
                <input className="input" placeholder="Task title"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="Details..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Due Date</label>
                  <input className="input" type="date"
                    value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Assignee</label>
                <select className="input" value={form.assignee_id}
                  onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createTask.mutate()}
                  disabled={!form.title || createTask.isPending}>
                  {createTask.isPending ? <span className="spinner" /> : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, users, onMove }: { task: Task; users: User[]; onMove: (s: TaskStatus) => void }) {
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done']
  const currentIdx = statuses.indexOf(task.status)
  const assignee = users.find((u) => u.id === task.assignee_id)

  return (
    <Link to={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '.85rem', cursor: 'pointer', transition: 'border-color .15s' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
        <p style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: '.5rem', lineHeight: 1.4 }}>
          {task.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.due_date && (
            <span style={{ fontSize: '.7rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.5rem' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.6rem', fontWeight: 700, color: '#fff' }}>
              {assignee.full_name[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '.75rem', color: 'var(--text-2)' }}>{assignee.full_name}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '.3rem', marginTop: '.6rem' }} onClick={(e) => e.preventDefault()}>
          {currentIdx > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ padding: '.2rem .5rem', fontSize: '.7rem' }}
              onClick={(e) => { e.preventDefault(); onMove(statuses[currentIdx - 1]) }}>← Back</button>
          )}
          {currentIdx < statuses.length - 1 && (
            <button className="btn btn-primary btn-sm" style={{ padding: '.2rem .5rem', fontSize: '.7rem', marginLeft: 'auto' }}
              onClick={(e) => { e.preventDefault(); onMove(statuses[currentIdx + 1]) }}>Next →</button>
          )}
        </div>
      </div>
    </Link>
  )
}

const columnStyle: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0,
}
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 50,
}
const modal: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '2rem', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow)',
}
const errBox: React.CSSProperties = {
  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
  color: 'var(--red)', borderRadius: 'var(--radius)', padding: '.6rem .9rem', fontSize: '.85rem', marginBottom: '1rem',
}
