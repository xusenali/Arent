import { useState } from 'react'
import { loginRequest } from '../api/authApi.js'
import { useAuthStore } from '../store/authStore.js'

// Shu vaqtdan keyin "server uyg'onmoqda" degan ogohlantirish chiqadi.
const SLOW_AFTER_MS = 4000

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const [error, setError] = useState(null)
  const setSession = useAuthStore((state) => state.setSession)

  async function login({ phone, password }) {
    setIsLoading(true)
    setIsSlow(false)
    setError(null)
    const slowTimer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS)
    try {
      const result = await loginRequest({ phone, password })
      setSession(result)
      return result
    } catch (err) {
      setError(err.message ?? 'Kirishda xatolik yuz berdi')
      throw err
    } finally {
      clearTimeout(slowTimer)
      setIsLoading(false)
      setIsSlow(false)
    }
  }

  return { login, isLoading, isSlow, error }
}
