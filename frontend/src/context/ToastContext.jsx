import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const showToast = useCallback((message, category = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, category }])
    timers.current[id] = setTimeout(() => dismiss(id), 5000)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="container flash-messages">
        {toasts.map((t) => (
          <div key={t.id} className={`alert alert-${t.category}`}>
            {t.message}
            <button className="alert-close" onClick={() => dismiss(t.id)}>&times;</button>
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
