import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/useApi'
import Icon from '../components/Icon'

export default function Login() {
  usePageTitle('Login')
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const data = await login(username, password)
      showToast(data.message, 'success')
      if (data.user.is_admin) navigate('/admin', { replace: true })
      else navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-mark">SB</div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Log in to place orders and track your stitching.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username or email</label>
            <div className="input-group">
              <span className="input-group-icon"><Icon name="user" size={17} /></span>
              <input
                id="username"
                type="text"
                className="form-control"
                required
                autoComplete="username"
                placeholder="Your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={reveal ? 'text' : 'password'}
                className="form-control"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
              >
                <Icon name={reveal ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting && <span className="spinner" />}
            Log in
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>

        <div className="demo-hint">
          Demo admin: <code>admin</code> / <code>admin123</code>
        </div>
      </div>
    </div>
  )
}
