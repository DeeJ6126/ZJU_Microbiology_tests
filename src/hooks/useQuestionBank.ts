import { useEffect, useState } from 'react'
import type { QuestionBank } from '../types'

interface UseQuestionBankResult {
  questionBank: QuestionBank | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useQuestionBank(): UseQuestionBankResult {
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadQuestionBank() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `${import.meta.env.BASE_URL}question-bank.json`,
          {
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error(`题库文件读取失败（HTTP ${response.status}）。`)
        }

        const data = (await response.json()) as QuestionBank
        setQuestionBank(data)
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : '题库加载时发生未知错误。'
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadQuestionBank()

    return () => controller.abort()
  }, [reloadToken])

  return {
    questionBank,
    loading,
    error,
    reload: () => setReloadToken((current) => current + 1),
  }
}
