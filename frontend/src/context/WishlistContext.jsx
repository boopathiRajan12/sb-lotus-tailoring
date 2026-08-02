import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const WishlistContext = createContext(null)

/**
 * Holds the set of saved product ids so every product card can render its
 * heart without each one issuing its own request.
 */
export function WishlistProvider({ children }) {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [ids, setIds] = useState(() => new Set())

  const refresh = useCallback(async () => {
    if (!user || user.is_admin) {
      setIds(new Set())
      return
    }
    try {
      const data = await api.get('/api/wishlist/ids')
      setIds(new Set(data.product_ids))
    } catch {
      // A wishlist that fails to load shouldn't break the page around it.
      setIds(new Set())
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const toggle = useCallback(async (product) => {
    if (!user) {
      showToast('Please log in to save items to your wishlist.', 'info')
      return false
    }
    try {
      const data = await api.post('/api/wishlist/toggle', { product_id: product.id })
      setIds((prev) => {
        const next = new Set(prev)
        if (data.saved) next.add(product.id)
        else next.delete(product.id)
        return next
      })
      updateUser({ wishlist_count: data.count })
      showToast(data.message, data.saved ? 'success' : 'info')
      return data.saved
    } catch (err) {
      showToast(err.message, 'danger')
      return false
    }
  }, [user, showToast, updateUser])

  const value = useMemo(() => ({
    ids,
    isSaved: (productId) => ids.has(productId),
    toggle,
    refresh,
    count: ids.size,
  }), [ids, toggle, refresh])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
