import { useState } from 'react'
import { loginRequest } from '../api/authApi.js'
import { useAuthStore } from '../store/authStore.js'

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const setSession = useAuthStore((state) => state.setSession)

  async function login({ phone, password }) {
    setIsLoading(true)
    setError(null)
    try {
      const result = await loginRequest({ phone, password })
      setSession(result)
      return result
    } catch (err) {
      setError(err.message ?? 'Kirishda xatolik yuz berdi')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { login, isLoading, error }
}
