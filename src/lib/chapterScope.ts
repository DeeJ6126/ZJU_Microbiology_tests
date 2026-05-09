import type { ChapterMeta, QuestionBank } from '../types'

const LAST_YEAR_PPT_CHAPTER_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 19, 20,
])

const CURRENT_SYLLABUS_CHAPTER_IDS = new Set([
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20, 21, 22, 23,
])

export const SCOPED_CHAPTER_IDS = Array.from(
  new Set([...LAST_YEAR_PPT_CHAPTER_IDS, ...CURRENT_SYLLABUS_CHAPTER_IDS]),
).sort((left, right) => left - right)

export type ChapterScope = 'both' | 'current-only' | 'last-year-only'

export function isScopedChapterId(chapterId: number): boolean {
  return SCOPED_CHAPTER_IDS.includes(chapterId)
}

export function getChapterScope(chapterId: number): ChapterScope | null {
  const inLastYear = LAST_YEAR_PPT_CHAPTER_IDS.has(chapterId)
  const inCurrent = CURRENT_SYLLABUS_CHAPTER_IDS.has(chapterId)

  if (inLastYear && inCurrent) {
    return 'both'
  }

  if (inCurrent) {
    return 'current-only'
  }

  if (inLastYear) {
    return 'last-year-only'
  }

  return null
}

export function getChapterScopeLabel(chapterId: number): string {
  const scope = getChapterScope(chapterId)

  if (scope === 'both') {
    return '大纲 + 去年'
  }

  if (scope === 'current-only') {
    return '仅今年大纲'
  }

  if (scope === 'last-year-only') {
    return '仅去年 PPT'
  }

  return '不在范围内'
}

export function getScopedChapters(questionBank: QuestionBank): ChapterMeta[] {
  return questionBank.chapters.filter((chapter) => isScopedChapterId(chapter.id))
}

export function getScopedQuestionCount(questionBank: QuestionBank): number {
  return questionBank.questions.filter((question) =>
    isScopedChapterId(question.chapterId),
  ).length
}
