import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { tasksApi } from '../api'
import type { Task, Comment, TaskStatus, TaskPriority } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../store/authStore'

const STATUSES: TaskStatus[]   = ['todo', 'in_progress', 'in_review', 'done']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const qc     = useQueryClient()
  const user   = useAuthStore((s) => s.user)
  const [comment, setComment] = useState('')

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId).then((r) => r.data),
  })

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', taskId],
    queryFn: () => tasksApi.getComments(taskId).then((r) => r.data ?? []),
  })

  const updateTask = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const addComment = useMutation({
    mutationFn: () => tasksApi.addComment(taskId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
      setComment('')
    },
  })

  const deleteTask = useMutation({
    mutationFn: () => tasksApi.delete(taskId),
    onSuccess: () => window.history.back(),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" style={{ margin: 'auto' }} /></div>
  if (!task) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>Task not found</div>

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => window.history.back()}
        style={{ display: 'flex', alignItems: 'center', gap: '.35rem', color: 'var(--text-2)', fontSize: '.875rem', marginBottom: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main */}
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.75rem', lineHeight: 1.3 }}>{task.title}</h1>

          {task.description && (
            <p style={{ color: 'var(--text-2)', fontSize: '.9rem', lineHeight: 1.7, marginBottom: '1.5rem',
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              {task.description}
            </p>
          )}

          {/* Comments */}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Comments <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({comments.length})</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.25rem' }}>
            {comments.length === 0 && (
              <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>No comments yet. Be the first!</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="card" style={{ padding: '.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#fff' }}>
                    U
                  </div>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>
                    User #{c.user_id} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p style={{ fontSize: '.875rem', lineHeight: 1.6 }}>{c.content}</p>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div style={{ display: 'flex', gap: '.75rem' }}>
            <input className="input" placeholder="Write a comment..."
              value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) addComment.mutate() }} />
            <button className="btn btn-primary" onClick={() => addComment.mutate()}
              disabled={!comment.trim() || addComment.isPending}>
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div className="form-group">
                <label className="label">Status</label>
                <select className="input" value={task.status}
                  onChange={(e) => updateTask.mutate({ status: e.target.value as TaskStatus })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input" value={task.priority}
                  onChange={(e) => updateTask.mutate({ priority: e.target.value as TaskPriority })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {task.due_date && (
                <div>
                  <p className="label">Due Date</p>
                  <p style={{ fontSize: '.875rem' }}>{new Date(task.due_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="label">Created</p>
                <p style={{ fontSize: '.875rem', color: 'var(--text-2)' }}>
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          <button className="btn btn-danger"
            onClick={() => { if (confirm('Delete this task?')) deleteTask.mutate() }}
            disabled={deleteTask.isPending}>
            <Trash2 size={15} /> Delete Task
          </button>
        </div>
      </div>
    </div>
  )
}
