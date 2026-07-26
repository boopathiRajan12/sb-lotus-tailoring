import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const initialForm = { username: '', email: '', phone: '', address: '', password: '', confirm_password: '' }

export default function Register() {
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await register(form)
      showToast(data.message, 'success')
      navigate('/login')
    } catch (err) {
      showToast(err.message, 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input type="text" id="username" className="form-control" required placeholder="Choose a username" value={form.username} onChange={setField('username')} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input type="email" id="email" className="form-control" required placeholder="your@email.com" value={form.email} onChange={setField('email')} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input type="text" id="phone" className="form-control" placeholder="Your phone number" value={form.phone} onChange={setField('phone')} />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea id="address" className="form-control" rows="2" placeholder="Your delivery address" value={form.address} onChange={setField('address')} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password * (min 6 characters)</label>
            <input type="password" id="password" className="form-control" required minLength={6} placeholder="Create a password" value={form.password} onChange={setField('password')} />
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm Password *</label>
            <input type="password" id="confirm_password" className="form-control" required placeholder="Confirm your password" value={form.confirm_password} onChange={setField('confirm_password')} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>Register</button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  )
}
