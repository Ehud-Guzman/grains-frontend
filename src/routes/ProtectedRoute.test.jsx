import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// ProtectedRoute reads identity from AuthContext; mock the hook so each test can
// declare exactly who is signed in.
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

/** Render the guard at a path, with real routes for its redirect targets. */
function renderAt(element, initialPath = '/admin/secret') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/secret" element={element} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const auth = (overrides) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  ...overrides,
})

const SUPERADMIN_UP = ['supervisor', 'admin', 'superadmin']

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a spinner while the session is still restoring', () => {
    useAuth.mockReturnValue(auth({ isLoading: true }))
    renderAt(<ProtectedRoute><div>secret</div></ProtectedRoute>)

    // Deliberately must NOT redirect yet — a hard redirect here would bounce
    // users to /login on every page reload while the refresh cookie is checked.
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor to /login', () => {
    useAuth.mockReturnValue(auth({ isAuthenticated: false }))
    renderAt(<ProtectedRoute><div>secret</div></ProtectedRoute>)

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('renders the children for an authenticated user with a permitted role', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'admin', customPermissions: [] },
    }))
    renderAt(
      <ProtectedRoute requireRole={SUPERADMIN_UP}><div>secret</div></ProtectedRoute>,
    )

    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('redirects to / when the role is not permitted', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'customer', customPermissions: [] },
    }))
    renderAt(
      <ProtectedRoute requireRole={SUPERADMIN_UP}><div>secret</div></ProtectedRoute>,
    )

    expect(screen.getByText('home page')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('allows a superadmin through a permission gate regardless of customPermissions', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'superadmin', customPermissions: [] },
    }))
    renderAt(
      <ProtectedRoute requireRole={['superadmin']} requirePermission="manage_etims">
        <div>secret</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('allows a user whose customPermissions include the required permission', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'admin', customPermissions: ['manage_etims'] },
    }))
    renderAt(
      <ProtectedRoute requireRole={['superadmin']} requirePermission="manage_etims">
        <div>secret</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('blocks a user missing the required permission', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'admin', customPermissions: [] },
    }))
    renderAt(
      <ProtectedRoute requireRole={['superadmin']} requirePermission="manage_etims">
        <div>secret</div>
      </ProtectedRoute>,
    )

    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('renders children with no role requirement for any signed-in user', () => {
    useAuth.mockReturnValue(auth({
      isAuthenticated: true,
      user: { role: 'driver' },
    }))
    renderAt(<ProtectedRoute><div>secret</div></ProtectedRoute>)

    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
