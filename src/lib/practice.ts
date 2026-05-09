import type {
  MistakeRecord,
  PracticeAnswer,
  PracticeMode,
  PracticeSession,
  Question,
  QuestionBank,
} from '../types'
import { isScopedChapterId } from './chapterScope'

export function normalizeChapterSelection(
  chapterIds: number[],
  questionBank: QuestionBank,
): number[] {
  const allowed = new Set(
    questionBank.chapters
      .map((chapter) => chapter.id)
      .filter((chapterId) => isScopedChapterId(chapterId)),
  )
  const uniqueIds = Array.from(new Set(chapterIds))

  return uniqueIds
    .filter((chapterId) => allowed.has(chapterId))
    .sort((left, right) => left - right)
}

export function getPracticePool(
  questionBank: QuestionBank,
  chapterIds: number[],
): Question[] {
  const selected = new Set(chapterIds)
  return questionBank.questions.filter((question) =>
    selected.has(question.chapterId) && isScopedChapterId(question.chapterId),
  )
}

export function createPracticeSession(
  chapterIds: number[],
  questionBank: QuestionBank,
): PracticeSession | null {
  const selectedChapterIds = normalizeChapterSelection(chapterIds, questionBank)

  if (!selectedChapterIds.length) {
    return null
  }

  return buildPracticeSession({
    mode: 'chapters',
    title: buildChapterSessionTitle(selectedChapterIds, questionBank),
    selectedChapterIds,
    questionIds: getPracticePool(questionBank, selectedChapterIds).map(
      (question) => question.id,
    ),
  })
}

export function createMistakePracticeSession(
  mistakeRecords: MistakeRecord[],
  questionBank: QuestionBank,
): PracticeSession | null {
  const mistakeQuestionIds = Array.from(
    new Set(mistakeRecords.map((record) => record.questionId)),
  )

  if (!mistakeQuestionIds.length) {
    return null
  }

  const selectedChapterIds = normalizeChapterSelection(
    Array.from(
      new Set(
        mistakeQuestionIds
          .map((questionId) =>
            questionBank.questions.find((question) => question.id === questionId),
          )
          .filter(isScopedQuestion)
          .map((question) => question.chapterId),
      ),
    ),
    questionBank,
  )

  return buildPracticeSession({
    mode: 'mistakes',
    title: '错题本练习',
    selectedChapterIds,
    questionIds: mistakeQuestionIds,
  })
}

function buildPracticeSession({
  mode,
  title,
  selectedChapterIds,
  questionIds,
}: {
  mode: PracticeMode
  title: string
  selectedChapterIds: number[]
  questionIds: string[]
}): PracticeSession | null {
  if (!questionIds.length) {
    return null
  }

  return {
    mode,
    title,
    selectedChapterIds,
    questionOrder: shuffleArray(questionIds),
    currentIndex: 0,
    answers: [],
    startedAt: new Date().toISOString(),
  }
}

export function buildQuestionLookup(
  questionBank: QuestionBank,
): Record<string, Question> {
  const lookup: Record<string, Question> = {}

  for (const question of questionBank.questions) {
    lookup[question.id] = question
  }

  return lookup
}

export function findAnswer(
  session: PracticeSession | null,
  questionId: string,
): PracticeAnswer | undefined {
  return session?.answers.find((answer) => answer.questionId === questionId)
}

export function getScoreSummary(session: PracticeSession | null) {
  const total = session?.questionOrder.length ?? 0
  const answered = session?.answers.length ?? 0
  const correct =
    session?.answers.filter((answer) => answer.isCorrect).length ?? 0
  const unanswered = Math.max(total - answered, 0)
  const accuracy = total ? Math.round((correct / total) * 100) : 0

  return {
    total,
    answered,
    correct,
    unanswered,
    accuracy,
  }
}

export function getPdfHref(sourcePdf: string, sourcePage?: number): string {
  const basePath = `${import.meta.env.BASE_URL}${sourcePdf}`
  return sourcePage ? `${basePath}#page=${sourcePage}` : basePath
}

function buildChapterSessionTitle(
  chapterIds: number[],
  questionBank: QuestionBank,
): string {
  if (chapterIds.length === 1) {
    const chapter = questionBank.chapters.find((item) => item.id === chapterIds[0])
    return chapter ? `Chapter ${chapter.id} 单章练习` : '单章练习'
  }

  return `${chapterIds.length} 章混练`
}

function shuffleArray<T>(items: T[]): T[] {
  const nextItems = [...items]

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ]
  }

  return nextItems
}

function isScopedQuestion(question: Question | undefined): question is Question {
  return Boolean(question && isScopedChapterId(question.chapterId))
}
