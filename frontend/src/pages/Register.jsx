import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePageTitle } from '../hooks/useApi'
import { passwordStrength } from '../api/format'
import Icon from '../components/Icon'

const initialForm = {
  username: '', email: '', phone: '', address: '', password: '', confirm_password: '',
}

export default function Register() {
  usePageTitle('Create account')
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [reveal, setReveal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const strength = passwordStrength(form.password)
  const mismatch = form.confirm_password && form.password !== form.confirm_password

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (mismatch) {
      showToast('Passwords do not match.', 'danger')
      return
    }

    setSubmitting(true)
    try {
      const data = await register(form)
      showToast(data.message, 'success')
      navigate('/login', { replace: true })
    } catch (err) {
      showToast(err.message, 'danger')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-mark">SB</div>
        <h2>Create your account</h2>
        <p className="auth-sub">Save your measurements once and reorder in seconds.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              id="username"
              type="text"
              className="form-control"
              required
              minLength={3}
              autoComplete="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={setField('username')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              className="form-control"
              required
              autoComplete="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={setField('email')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              className="form-control"
              maxLength={15}
              autoComplete="tel"
              placeholder="Your phone number"
              value={form.phone}
              onChange={setField('phone')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Delivery address</label>
            <textarea
              id="address"
              className="form-control"
              rows="2"
              placeholder="Where should we deliver your orders?"
              value={form.address}
              onChange={setField('address')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-field">
              <input
                id="password"
                type={reveal ? 'text' : 'password'}
                className="form-control"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={setField('password')}
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
            {form.password && (
              <>
                <div className="strength-meter">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`strength-bar ${level <= strength.score ? `on-${strength.label}` : ''}`}
                    />
                  ))}
                </div>
                <span className="form-hint">Strength: {strength.label || 'too short'}</span>
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirm password *</label>
            <input
              id="confirm_password"
              type={reveal ? 'text' : 'password'}
              className={`form-control ${mismatch ? 'is-invalid' : ''}`}
              required
              autoComplete="new-password"
              placeholder="Type your password again"
              value={form.confirm_password}
              onChange={setField('confirm_password')}
            />
            {mismatch && (
              <span className="form-hint" style={{ color: 'var(--danger)' }}>
                Passwords don't match.
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || mismatch}>
            {submitting ? <span className="spinner" /> : <Icon name="check" size={17} />}
            Create account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  )
}
