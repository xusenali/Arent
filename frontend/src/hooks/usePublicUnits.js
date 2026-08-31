import { useEffect, useState } from 'react'
import { fetchPublicUnits } from '../api/publicApi.js'

export function usePublicUnits() {
  const [units, setUnits] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchPublicUnits()
      .then((data) => {
        if (!cancelled) setUnits(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { units, isLoading, error }
}
