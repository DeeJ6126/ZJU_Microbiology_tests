import { createContext } from 'react'
import type {
  AnswerSelection,
  MistakeRecord,
  PracticeSession,
  Question,
  QuestionBank,
  VocabularyRecord,
  VocabularyRecordInput,
  VocabularyStatus,
} from '../types'

export interface PracticeContextValue {
  questionBank: QuestionBank
  session: PracticeSession | null
  selectedChapterIds: number[]
  mistakeRecords: MistakeRecord[]
  vocabularyRecords: VocabularyRecord[]
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
  addVocabularyRecord: (input: VocabularyRecordInput) => VocabularyRecord | null
  removeVocabularyRecord: (recordId: string) => void
  updateVocabularyRecordStatus: (recordId: string, status: VocabularyStatus) => void
  clearVocabularyRecords: () => void
  importVocabularyRecords: (records: VocabularyRecord[]) => void
  getQuestionById: (questionId: string) => Question | undefined
}

export const PracticeContext = createContext<PracticeContextValue | null>(null)
