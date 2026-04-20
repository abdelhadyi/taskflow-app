import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FolderKanban } from 'lucide-react'
import { projectsApi } from '../api'
import type { Project } from '../types'

const COLORS = ['#6366f1','#22c55e','#eab308','#ef4444','#f97316','#06b6d4','#ec4899','#8b5cf6']

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] })
  const [err, setErr]   = useState('')

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); setForm({ name: '', description: '', color: COLORS[0] }) },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'Failed to create'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Projects</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '.875rem' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: 'auto' }} /></div>}

      {!isLoading && projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
          <FolderKanban size={48} style={{ margin: '0 auto 1rem', opacity: .3 }} />
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>No projects yet</p>
          <p style={{ fontSize: '.875rem' }}>Create your first project to get started</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {projects.map((p) => (
          <div key={p.id} className="card" style={{ position: 'relative' }}>
            <Link to={`/projects/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.75rem' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</span>
              </div>
              <p style={{ fontSize: '.85rem', color: 'var(--text-2)', marginBottom: '1rem', minHeight: '2.6em' }}>
                {p.description || 'No description'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
              </div>
            </Link>
            <button
              className="btn btn-sm"
              style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-3)', padding: '.3rem' }}
              onClick={(e) => { e.preventDefault(); if (confirm('Delete this project?')) deleteMutation.mutate(p.id) }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>New Project</h2>
            {err && <div style={errBox}>{err}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Name *</label>
                <input className="input" placeholder="Project name"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" placeholder="What is this project about?" rows={3}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="label">Color</label>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : 'none', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createMutation.mutate()}
                  disabled={!form.name || createMutation.isPending}>
                  {createMutation.isPending ? <span className="spinner" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 50,
}
const modal: React.CSSProperties = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '2rem', width: '100%', maxWidth: 460, boxShadow: 'var(--shadow)',
}
const errBox: React.CSSProperties = {
  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
  color: 'var(--red)', borderRadius: 'var(--radius)', padding: '.6rem .9rem', fontSize: '.85rem', marginBottom: '1rem',
}
