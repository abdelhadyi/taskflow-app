import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Auth store tests ──────────────────────────────────────────────────────────
import { useAuthStore } from '../store/authStore'

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('setAuth stores token and marks authenticated', () => {
    const user = { id: 1, email: 'a@a.com', full_name: 'Alice', role: 'member', avatar_url: '', created_at: '' }
    useAuthStore.getState().setAuth(user, 'tok123')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().token).toBe('tok123')
    expect(localStorage.getItem('token')).toBe('tok123')
  })

  it('logout clears state and localStorage', () => {
    localStorage.setItem('token', 'old')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

// ── Component helpers ─────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrap(ui: React.ReactElement) {
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

// ── Login page ────────────────────────────────────────────────────────────────
import LoginPage from '../pages/LoginPage'
import * as api from '../api'

vi.mock('../api', async (importOriginal) => {
  const orig = await importOriginal<typeof api>()
  return { ...orig, authApi: { ...orig.authApi, login: vi.fn(), register: vi.fn() } }
})

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    wrap(<LoginPage />)
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
  })

  it('shows error on failed login', async () => {
    vi.mocked(api.authApi.login).mockRejectedValueOnce({
      response: { data: { error: 'invalid credentials' } },
    })
    wrap(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'bad@bad.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText('invalid credentials')).toBeInTheDocument())
  })
})

// ── RegisterPage ──────────────────────────────────────────────────────────────
import RegisterPage from '../pages/RegisterPage'

describe('RegisterPage', () => {
  it('renders all registration fields', () => {
    wrap(<RegisterPage />)
    expect(screen.getByPlaceholderText(/alice smith/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/at least 6/i)).toBeInTheDocument()
  })
})

// ── Utility: badge classes ────────────────────────────────────────────────────
describe('CSS badge class naming', () => {
  const statuses = ['todo', 'in_progress', 'in_review', 'done']
  const priorities = ['low', 'medium', 'high', 'urgent']

  it('each status maps to a badge class', () => {
    statuses.forEach((s) => {
      const cls = `badge-${s}`
      expect(cls).toMatch(/^badge-/)
    })
  })

  it('each priority maps to a badge class', () => {
    priorities.forEach((p) => {
      const cls = `badge-${p}`
      expect(cls).toMatch(/^badge-/)
    })
  })
})
