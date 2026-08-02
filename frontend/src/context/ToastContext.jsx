import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'

const ToastContext = createContext(null)
let nextId = 1

const TOAST_ICON = {
  success: 'checkCircle',
  danger: 'alertCircle',
  warning: 'alertTriangle',
  info: 'info',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    // Flag as leaving first so the exit animation gets a chance to play.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      delete timers.current[id]
    }, 200)
  }, [])

  const showToast = useCallback((message, category = 'info', duration = 4500) => {
    const id = nextId++
    // Cap the stack so a burst of errors can't cover the page.
    setToasts((prev) => [...prev.slice(-3), { id, message, category }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => Object.values(pending).forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.category} ${t.leaving ? 'leaving' : ''}`}>
            <Icon name={TOAST_ICON[t.category] || 'info'} />
            <div className="toast-body">{t.message}</div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
