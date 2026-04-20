import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { notificationsApi } from '../api'
import type { Notification } from '../types'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }) },
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }) },
  })

  const deleteNotif = useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Notifications</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '.875rem' }}>
            {unreadCount} unread · {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" style={{ margin: 'auto' }} /></div>}

      {!isLoading && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
          <Bell size={48} style={{ margin: '0 auto 1rem', opacity: .3 }} />
          <p style={{ fontWeight: 500 }}>All caught up!</p>
          <p style={{ fontSize: '.875rem' }}>No notifications to show.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {notifications.map((n) => (
          <div key={n.id} className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem',
              opacity: n.is_read ? .55 : 1, transition: 'opacity .15s' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%',
              background: n.is_read ? 'var(--text-3)' : 'var(--accent)',
              flexShrink: 0, marginTop: '.45rem' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '.9rem' }}>{n.title}</p>
              <p style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: '.15rem' }}>{n.body}</p>
              <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.35rem' }}>
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                {n.reference_type && ` · ${n.reference_type}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0 }}>
              {!n.is_read && (
                <button className="btn btn-ghost btn-sm" onClick={() => markRead.mutate(n.id)}
                  title="Mark as read">
                  <CheckCheck size={14} />
                </button>
              )}
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}
                onClick={() => deleteNotif.mutate(n.id)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
