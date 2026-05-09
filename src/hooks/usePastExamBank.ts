import { useEffect, useState } from 'react'
import type { PastExamBank } from '../types'

interface UsePastExamBankResult {
  pastExamBank: PastExamBank | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function usePastExamBank(): UsePastExamBankResult {
  const [pastExamBank, setPastExamBank] = useState<PastExamBank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPastExamBank() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${import.meta.env.BASE_URL}past-exams.json`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`历年真题文件读取失败（HTTP ${response.status}）。`)
        }

        const data = (await response.json()) as PastExamBank
        setPastExamBank(data)
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }

        const message =
          loadError instanceof Error ? loadError.message : '历年真题加载时发生未知错误。'
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadPastExamBank()

    return () => controller.abort()
  }, [reloadToken])

  return {
    pastExamBank,
    loading,
    error,
    reload: () => setReloadToken((current) => current + 1),
  }
}
