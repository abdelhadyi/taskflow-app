import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import type { AuthResponse } from '../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      const data: AuthResponse = res.data
      setAuth(data.user, data.token)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={logo}>
          <CheckSquare size={28} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>TaskFlow</span>
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.35rem' }}>Welcome back</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '.875rem', marginBottom: '1.75rem' }}>
          Sign in to your workspace
        </p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '.5rem', justifyContent: 'center' }}>
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.875rem', color: 'var(--text-2)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-h)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', padding: '1.5rem',
}
const card: React.CSSProperties = {
  width: '100%', maxWidth: 420, background: 'var(--bg-2)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '2.5rem', boxShadow: 'var(--shadow)',
}
const logo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '2rem' }
const errorBox: React.CSSProperties = {
  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
  color: 'var(--red)', borderRadius: 'var(--radius)', padding: '.65rem .9rem',
  fontSize: '.85rem', marginBottom: '1rem',
}
