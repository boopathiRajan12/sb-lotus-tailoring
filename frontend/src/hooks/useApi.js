import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

/**
 * Fetch a JSON endpoint with loading and error state.
 *
 * Pages used to call `api.get(...).then(setState)` with no catch, so any
 * failure left a permanently blank screen and an unhandled rejection. This
 * always resolves to one of loading / error / data.
 *
 * Returns { data, loading, error, reload, setData }.
 */
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)
  // Guards against a slow earlier request overwriting a newer one.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!path || skip) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(path)
      if (id === requestId.current) setData(result)
    } catch (err) {
      if (id === requestId.current) setError(err)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [path, skip])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load, setData }
}

/** Debounce a rapidly-changing value (search input, price filters). */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

/** Run a handler when a click lands outside the referenced element. */
export function useOnClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler, active])
}

/** Set document.title, restoring the previous value on unmount. */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · SB Lotus Tailoring` : 'SB Lotus Tailoring Shop'
    return () => { document.title = previous }
  }, [title])
}
