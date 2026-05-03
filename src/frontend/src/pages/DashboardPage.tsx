import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FolderKanban, CheckSquare, Clock, Bell } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { projectsApi, notificationsApi } from '../api'
import type { Project, Notification } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  })

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => notificationsApi.list(false).then((r) => r.data),
    select: (d) => d.slice(0, 5),
  })

  const activeProjects = projects.filter((p) => p.status === 'active').length

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '.35rem' }}>
        Good day, {user?.full_name?.split(' ')[0]} 👋
      </h1>
      <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>
        Here's what's happening in your workspace.
      </p>

      {/* Stats */}
      <div style={statsGrid}>
        <StatCard icon={<FolderKanban size={20} color="var(--accent)" />}
          label="Total Projects" value={projects.length} />
        <StatCard icon={<CheckSquare size={20} color="var(--green)" />}
          label="Active Projects" value={activeProjects} />
        <StatCard icon={<Bell size={20} color="var(--yellow)" />}
          label="Unread Notifications"
          value={notifications.filter((n) => !n.is_read).length} />
        <StatCard icon={<Clock size={20} color="var(--orange)" />}
          label="Recent Activity" value={notifications.length} />
      </div>

      {/* Recent Projects */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Recent Projects</h2>
          <Link to="/projects" style={{ fontSize: '.85rem', color: 'var(--accent-h)' }}>View all →</Link>
        </div>
        {projects.length === 0
          ? <Empty text="No projects yet. Create your first one!" />
          : (
            <div style={projectsGrid}>
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.75rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '.95rem' }}>{p.name}</span>
                    </div>
                    <p style={{ fontSize: '.8rem', color: 'var(--text-2)', marginBottom: '.75rem', minHeight: '2.4em' }}>
                      {p.description ?? 'No description'}
                    </p>
                    <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </section>

      {/* Recent Notifications */}
      <section>
        <div style={sectionHeader}>
          <h2 style={sectionTitle}>Recent Notifications</h2>
          <Link to="/notifications" style={{ fontSize: '.85rem', color: 'var(--accent-h)' }}>View all →</Link>
        </div>
        {notifications.length === 0
          ? <Empty text="No notifications yet." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {notifications.map((n) => (
                <div key={n.id} className="card"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '.9rem 1.1rem',
                    opacity: n.is_read ? .6 : 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--text-3)' : 'var(--accent)',
                    flexShrink: 0, marginTop: '.45rem' }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '.875rem' }}>{n.title}</p>
                    <p style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{n.body}</p>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.25rem' }}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '.65rem', background: 'var(--bg-3)', borderRadius: 'var(--radius)' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '.8rem', color: 'var(--text-2)', marginTop: '.2rem' }}>{label}</p>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '.875rem',
      background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
      {text}
    </div>
  )
}

const statsGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem',
}
const projectsGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem',
}
const sectionHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem',
}
const sectionTitle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 700 }
