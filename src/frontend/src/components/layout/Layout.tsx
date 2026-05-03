import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Bell, LogOut, User, CheckSquare,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../api'
import styles from './Layout.module.css'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: countData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const unread: number = countData?.unread_count ?? 0

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <CheckSquare size={22} color="var(--accent)" />
          <span>TaskFlow</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <FolderKanban size={18} /> Projects
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <Bell size={18} /> Notifications
            {unread > 0 && <span className={styles.badge}>{unread}</span>}
          </NavLink>
        </nav>

        <div className={styles.userBlock}>
          <div className={styles.avatar}>
            {user?.full_name?.[0]?.toUpperCase() ?? <User size={14} />}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.full_name ?? 'User'}</p>
            <p className={styles.userRole}>{user?.role}</p>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
