import { createContext } from 'react'
import type {
  AnswerSelection,
  MistakeRecord,
  PracticeSession,
  Question,
  QuestionBank,
} from '../types'

export interface PracticeContextValue {
  questionBank: QuestionBank
  session: PracticeSession | null
  selectedChapterIds: number[]
  mistakeRecords: MistakeRecord[]
  setSelectedChapterIds: (chapterIds: number[]) => void
  beginPractice: (chapterIds: number[]) => PracticeSession | null
  beginMistakePractice: () => PracticeSession | null
  restartPractice: () => PracticeSession | null
  recordAnswer: (questionId: string, selectedKey: AnswerSelection) => void
  goToIndex: (index: number) => void
  clearSession: () => void
  keepMistake: (questionId: string, selectedKey: AnswerSelection) => void
  removeMistake: (questionId: string) => void
  clearMistakes: () => void
  hasMistake: (questionId: string) => boolean
  getQuestionById: (questionId: string) => Question | undefined
}

export const PracticeContext = createContext<PracticeContextValue | null>(null)
