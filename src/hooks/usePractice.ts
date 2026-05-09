import { useContext } from 'react'
import { PracticeContext } from '../context/practiceContextObject'

export function usePractice() {
  const context = useContext(PracticeContext)

  if (!context) {
    throw new Error('usePractice must be used inside PracticeProvider')
  }

  return context
}
