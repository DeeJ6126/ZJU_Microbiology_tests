export type OptionKey = 'A' | 'B' | 'C' | 'D'
export type AnswerSelection = OptionKey | 'UNKNOWN'

export interface QuestionOption {
  key: OptionKey
  text: string
}

export interface ChapterMeta {
  id: number
  title: string
  questionCount: number
  sourcePdf: string
}

export interface Question {
  id: string
  chapterId: number
  chapterTitle: string
  number: number
  prompt: string
  options: QuestionOption[]
  answerKey: OptionKey
  sourcePdf: string
  sourcePage?: number
  hasFigure: boolean
  aiExplanation?: AiExplanation
}

export interface AiExplanation {
  model: string
  generatedAt: string
  explanation: string
  optionExplanations: Partial<Record<OptionKey, string>>
  confidence: 'high' | 'medium' | 'low'
}

export interface QuestionBank {
  generatedAt: string
  totalQuestions: number
  chapters: ChapterMeta[]
  questions: Question[]
}

export interface PracticeAnswer {
  questionId: string
  selectedKey: AnswerSelection
  isCorrect: boolean
  answeredAt: string
}

export type PracticeMode = 'chapters' | 'mistakes'

export interface PracticeSession {
  mode: PracticeMode
  title: string
  selectedChapterIds: number[]
  questionOrder: string[]
  currentIndex: number
  answers: PracticeAnswer[]
  startedAt: string
}

export interface MistakeRecord {
  questionId: string
  chapterId: number
  lastSelectedKey: AnswerSelection
  correctKey: OptionKey
  wrongCount: number
  lastAnsweredAt: string
}

export interface PastExamMatch {
  type: 'exact' | 'high' | 'review' | 'none'
  score: number
  stemRatio: number
  optionRatio: number
  sourceQuestionId: string | null
  sourceChapterId: number | null
}

export interface PastExamQuestion {
  number: number
  prompt: string
  options: QuestionOption[]
  answerKey: OptionKey | null
  aiExplanation: AiExplanation | null
  match: PastExamMatch
}

export interface PastExamSummary {
  totalQuestions: number
  autoFilled: number
  exactMatches: number
  highMatches: number
  reviewMatches: number
  unmatched: number
}

export interface PastExam {
  id: string
  title: string
  sourcePdf: string
  summary: PastExamSummary
  questions: PastExamQuestion[]
}

export interface PastExamBank {
  generatedAt: string
  sourceQuestionBank: string
  exams: PastExam[]
}
