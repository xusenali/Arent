import { useEffect, useState } from 'react'

/** `value` maydoni "Sarlavha || Matn" formatida saqlanadi (ContentTranslation). */
function parseRule(item) {
  const [title, body] = item.value.split('||').map((part) => part.trim())
  return { key: item.key, title: title ?? item.key, body: body ?? '' }
}

export function useRules(fetcher) {
  const [rules, setRules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetcher()
      .then((data) => {
        if (!cancelled) setRules(data.map(parseRule))
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
  }, [fetcher])

  return { rules, isLoading, error }
}
