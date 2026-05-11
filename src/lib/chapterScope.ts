import type { ChapterMeta, QuestionBank } from '../types'

export const SCOPED_CHAPTER_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 19, 20,
]

export function isScopedChapterId(chapterId: number): boolean {
  return SCOPED_CHAPTER_IDS.includes(chapterId)
}

export function getScopedChapters(questionBank: QuestionBank): ChapterMeta[] {
  return questionBank.chapters.filter((chapter) => isScopedChapterId(chapter.id))
}

export function getScopedQuestionCount(questionBank: QuestionBank): number {
  return questionBank.questions.filter((question) =>
    isScopedChapterId(question.chapterId),
  ).length
}
