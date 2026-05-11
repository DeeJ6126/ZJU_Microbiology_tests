import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import {
  buildQuestionLookup,
  createMistakePracticeSession,
  createPracticeSession,
  getPracticePool,
  normalizeChapterSelection,
} from '../lib/practice'
import { PracticeContext } from './practiceContextObject'
import type {
  AnswerSelection,
  MistakeRecord,
  PracticeSession,
  Question,
  QuestionBank,
} from '../types'
import { isScopedChapterId } from '../lib/chapterScope'

const SESSION_STORAGE_KEY = 'microbiology-final-review-session'
const SELECTION_STORAGE_KEY = 'microbiology-final-review-selection'
const MISTAKES_STORAGE_KEY = 'microbiology-final-review-mistakes'

export function PracticeProvider({
  children,
  questionBank,
}: PropsWithChildren<{ questionBank: QuestionBank }>) {
  const questionLookup = buildQuestionLookup(questionBank)
  const [selectedChapterIds, setSelectedChapterIdsState] = useState<number[]>(
    () =>
      normalizeChapterSelection(
        readStoredValue<number[]>(SELECTION_STORAGE_KEY) ?? [],
        questionBank,
      ),
  )
  const [mistakeRecords, setMistakeRecords] = useState<MistakeRecord[]>(() =>
    sanitizeMistakes(
      readStoredValue<MistakeRecord[]>(MISTAKES_STORAGE_KEY) ?? [],
      questionBank,
      questionLookup,
    ),
  )
  const [session, setSession] = useState<PracticeSession | null>(() =>
    sanitizeSession(
      readStoredValue<PracticeSession>(SESSION_STORAGE_KEY),
      questionBank,
      mistakeRecords,
    ),
  )

  useEffect(() => {
    writeStoredValue(SELECTION_STORAGE_KEY, selectedChapterIds)
  }, [selectedChapterIds])

  useEffect(() => {
    writeStoredValue(MISTAKES_STORAGE_KEY, mistakeRecords)
  }, [mistakeRecords])

  useEffect(() => {
    writeStoredValue(SESSION_STORAGE_KEY, session)
  }, [session])

  function setSelectedChapterIds(chapterIds: number[]) {
    setSelectedChapterIdsState(normalizeChapterSelection(chapterIds, questionBank))
  }

  function beginPractice(chapterIds: number[]) {
    const normalizedChapterIds = normalizeChapterSelection(
      chapterIds,
      questionBank,
    )
    const nextSession = createPracticeSession(normalizedChapterIds, questionBank)

    setSelectedChapterIdsState(normalizedChapterIds)
    setSession(nextSession)

    return nextSession
  }

  function beginMistakePractice() {
    const nextSession = createMistakePracticeSession(mistakeRecords, questionBank)
    setSession(nextSession)
    return nextSession
  }

  function restartPractice() {
    if (session?.mode === 'mistakes') {
      return beginMistakePractice()
    }

    const sourceChapterIds = session?.selectedChapterIds ?? selectedChapterIds
    const nextSession = createPracticeSession(sourceChapterIds, questionBank)
    setSession(nextSession)
    return nextSession
  }

  function recordAnswer(questionId: string, selectedKey: AnswerSelection) {
    const question = questionLookup[questionId]

    if (!question) {
      return
    }

    const answeredAt = new Date().toISOString()
    const isCorrect = question.answerKey === selectedKey

    setSession((current) => {
      if (!current || current.answers.some((answer) => answer.questionId === questionId)) {
        return current
      }

      return {
        ...current,
        answers: [
          ...current.answers,
          {
            questionId,
            selectedKey,
            isCorrect,
            answeredAt,
          },
        ],
      }
    })

    if (!isCorrect) {
      setMistakeRecords((current) =>
        upsertMistake(current, question, selectedKey, answeredAt),
      )
      return
    }

    if (session?.mode === 'mistakes') {
      setMistakeRecords((current) =>
        current.filter((record) => record.questionId !== questionId),
      )
    }
  }

  function goToIndex(index: number) {
    setSession((current) => {
      if (!current) {
        return current
      }

      const nextIndex = Math.min(
        Math.max(index, 0),
        Math.max(current.questionOrder.length - 1, 0),
      )

      return {
        ...current,
        currentIndex: nextIndex,
      }
    })
  }

  function clearSession() {
    setSession(null)
  }

  function removeMistake(questionId: string) {
    setMistakeRecords((current) =>
      current.filter((record) => record.questionId !== questionId),
    )
  }

  function clearMistakes() {
    setMistakeRecords([])
  }

  function hasMistake(questionId: string) {
    return mistakeRecords.some((record) => record.questionId === questionId)
  }

  return (
    <PracticeContext.Provider
      value={{
        questionBank,
        session,
        selectedChapterIds,
        mistakeRecords,
        setSelectedChapterIds,
        beginPractice,
        beginMistakePractice,
        restartPractice,
        recordAnswer,
        goToIndex,
        clearSession,
        removeMistake,
        clearMistakes,
        hasMistake,
        getQuestionById: (questionId: string) => questionLookup[questionId],
      }}
    >
      {children}
    </PracticeContext.Provider>
  )
}

function sanitizeSession(
  session: PracticeSession | null,
  questionBank: QuestionBank,
  mistakeRecords: MistakeRecord[],
): PracticeSession | null {
  if (!session) {
      return null
    }

  if (session.mode === 'mistakes') {
    const validQuestionIds = new Set(mistakeRecords.map((record) => record.questionId))
    const questionOrder = session.questionOrder.filter((questionId) =>
      validQuestionIds.has(questionId),
    )
    const selectedChapterIds = normalizeChapterSelection(
      Array.from(
        new Set(
          mistakeRecords
            .map((record) =>
              questionBank.questions.find((question) => question.id === record.questionId),
            )
            .filter(isScopedQuestion)
            .map((question) => question.chapterId),
        ),
      ),
      questionBank,
    )

    if (!questionOrder.length) {
      return createMistakePracticeSession(mistakeRecords, questionBank)
    }

    return {
      ...session,
      mode: 'mistakes',
      title: session.title || '错题本练习',
      selectedChapterIds,
      questionOrder,
      currentIndex: Math.min(session.currentIndex, questionOrder.length - 1),
      answers: session.answers
        .filter((answer) => validQuestionIds.has(answer.questionId))
        .map((answer) => ({
          ...answer,
          answeredAt: answer.answeredAt || session.startedAt,
        })),
    }
  }

  const selectedChapterIds = normalizeChapterSelection(
    session.selectedChapterIds,
    questionBank,
  )

  if (!selectedChapterIds.length) {
    return null
  }

  const validQuestionIds = new Set(
    getPracticePool(questionBank, selectedChapterIds).map(
      (question) => question.id,
    ),
  )

  const questionOrder = session.questionOrder.filter((questionId) =>
    validQuestionIds.has(questionId),
  )

  if (!questionOrder.length) {
    return createPracticeSession(selectedChapterIds, questionBank)
  }

  return {
    ...session,
    mode: 'chapters',
    title: session.title || '章节混练',
    selectedChapterIds,
    questionOrder,
    currentIndex: Math.min(session.currentIndex, questionOrder.length - 1),
    answers: session.answers
      .filter((answer) => validQuestionIds.has(answer.questionId))
      .map((answer) => ({
        ...answer,
        answeredAt: answer.answeredAt || session.startedAt,
      })),
  }
}

function sanitizeMistakes(
  records: MistakeRecord[],
  questionBank: QuestionBank,
  questionLookup: Record<string, Question>,
): MistakeRecord[] {
  return records
    .map((record) => {
      const question = questionLookup[record.questionId]

      if (!question || !isScopedChapterId(question.chapterId)) {
        return null
      }

      return {
        questionId: record.questionId,
        chapterId: question.chapterId,
        lastSelectedKey: record.lastSelectedKey,
        correctKey: question.answerKey,
        wrongCount: Math.max(record.wrongCount, 1),
        lastAnsweredAt: record.lastAnsweredAt || questionBank.generatedAt,
      }
    })
    .filter((record): record is MistakeRecord => Boolean(record))
    .sort((left, right) =>
      right.lastAnsweredAt.localeCompare(left.lastAnsweredAt),
    )
}

function upsertMistake(
  records: MistakeRecord[],
  question: Question,
  selectedKey: AnswerSelection,
  answeredAt: string,
): MistakeRecord[] {
  const existing = records.find((record) => record.questionId === question.id)

  if (!existing) {
    return [
      {
        questionId: question.id,
        chapterId: question.chapterId,
        lastSelectedKey: selectedKey,
        correctKey: question.answerKey,
        wrongCount: 1,
        lastAnsweredAt: answeredAt,
      },
      ...records,
    ]
  }

  return [
    {
      ...existing,
      lastSelectedKey: selectedKey,
      correctKey: question.answerKey,
      wrongCount: existing.wrongCount + 1,
      lastAnsweredAt: answeredAt,
    },
    ...records.filter((record) => record.questionId !== question.id),
  ]
}

function readStoredValue<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : null
  } catch {
    return null
  }
}

function writeStoredValue(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key)
      return
    }

    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    window.localStorage.removeItem(key)
  }
}

function isScopedQuestion(question: Question | undefined): question is Question {
  return Boolean(question && isScopedChapterId(question.chapterId))
}
