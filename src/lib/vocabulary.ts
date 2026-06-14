import type {
  VocabularyRecord,
  VocabularyRecordInput,
  VocabularySourceType,
  VocabularyStatus,
} from '../types'

export type VocabularyToken =
  | { kind: 'term'; value: string }
  | { kind: 'text'; value: string }

const TERM_PATTERN = /[A-Za-z0-9][A-Za-z0-9+/]*(?:[-'][A-Za-z0-9+/]+)*/g
const VALID_STATUSES = new Set<VocabularyStatus>(['new', 'learning', 'mastered'])

export function tokenizeVocabularyText(text: string): VocabularyToken[] {
  const tokens: VocabularyToken[] = []
  let cursor = 0

  for (const match of text.matchAll(TERM_PATTERN)) {
    const value = match[0]
    const index = match.index ?? 0

    if (index > cursor) {
      tokens.push({ kind: 'text', value: text.slice(cursor, index) })
    }

    tokens.push({
      kind: isVocabularyTerm(value) ? 'term' : 'text',
      value,
    })
    cursor = index + value.length
  }

  if (cursor < text.length) {
    tokens.push({ kind: 'text', value: text.slice(cursor) })
  }

  return tokens
}

export function createVocabularyRecord(input: VocabularyRecordInput): VocabularyRecord {
  const term = input.term.trim()
  const normalizedTerm = normalizeVocabularyTerm(term)
  const now = new Date().toISOString()

  return {
    id: buildVocabularyId(normalizedTerm, input.sourceType, input.questionId, input.examId),
    term,
    normalizedTerm,
    contextText: input.contextText.trim(),
    sourceType: input.sourceType,
    questionId: input.questionId,
    examId: input.examId,
    questionNumber: input.questionNumber,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    status: 'new',
    addedAt: now,
    updatedAt: now,
  }
}

export function sanitizeVocabularyRecords(records: VocabularyRecord[]): VocabularyRecord[] {
  return records
    .map(sanitizeVocabularyRecord)
    .filter((record): record is VocabularyRecord => Boolean(record))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function mergeVocabularyRecords(
  existingRecords: VocabularyRecord[],
  incomingRecords: VocabularyRecord[],
): VocabularyRecord[] {
  const recordMap = new Map<string, VocabularyRecord>()

  for (const record of sanitizeVocabularyRecords(existingRecords)) {
    recordMap.set(getVocabularyDedupeKey(record), record)
  }

  for (const record of sanitizeVocabularyRecords(incomingRecords)) {
    const key = getVocabularyDedupeKey(record)
    const existing = recordMap.get(key)

    if (!existing || record.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      recordMap.set(key, {
        ...existing,
        ...record,
        addedAt: existing?.addedAt ?? record.addedAt,
      })
    }
  }

  return Array.from(recordMap.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

export function updateVocabularyStatus(
  records: VocabularyRecord[],
  recordId: string,
  status: VocabularyStatus,
): VocabularyRecord[] {
  const updatedAt = new Date().toISOString()

  return records.map((record) =>
    record.id === recordId
      ? {
          ...record,
          status,
          updatedAt,
        }
      : record,
  )
}

export function getVocabularyDedupeKey(record: VocabularyRecord) {
  const sourceId =
    record.sourceType === 'past-exam'
      ? record.examId ?? 'past-exam'
      : record.questionId ?? 'practice'

  return [
    record.normalizedTerm,
    record.sourceType,
    sourceId,
    record.questionNumber,
    normalizeContext(record.contextText),
  ].join('|')
}

function sanitizeVocabularyRecord(record: VocabularyRecord): VocabularyRecord | null {
  const term = String(record.term ?? '').trim()
  const normalizedTerm = normalizeVocabularyTerm(record.normalizedTerm || term)
  const contextText = String(record.contextText ?? '').trim()
  const sourceType = sanitizeSourceType(record.sourceType)
  const questionNumber = Number(record.questionNumber)
  const addedAt = sanitizeIsoDate(record.addedAt)
  const updatedAt = sanitizeIsoDate(record.updatedAt || record.addedAt)
  const status = VALID_STATUSES.has(record.status) ? record.status : 'new'

  if (!term || !normalizedTerm || !contextText || !sourceType || !Number.isFinite(questionNumber)) {
    return null
  }

  return {
    id:
      String(record.id ?? '').trim() ||
      buildVocabularyId(normalizedTerm, sourceType, record.questionId, record.examId),
    term,
    normalizedTerm,
    contextText,
    sourceType,
    questionId: sanitizeOptionalString(record.questionId),
    examId: sanitizeOptionalString(record.examId),
    questionNumber,
    chapterId: Number.isFinite(Number(record.chapterId)) ? Number(record.chapterId) : undefined,
    chapterTitle: sanitizeOptionalString(record.chapterTitle),
    status,
    addedAt,
    updatedAt,
  }
}

function isVocabularyTerm(value: string) {
  return value.length > 1 && /[A-Za-z]/.test(value)
}

function normalizeVocabularyTerm(term: string) {
  return term.trim().toLowerCase()
}

function normalizeContext(contextText: string) {
  return contextText.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120)
}

function buildVocabularyId(
  normalizedTerm: string,
  sourceType: VocabularySourceType,
  questionId?: string,
  examId?: string,
) {
  const sourceId = questionId || examId || 'source'
  const safeTerm = normalizedTerm.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const safeSource = sourceId.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${safeTerm}-${sourceType}-${safeSource}-${Date.now()}`
}

function sanitizeSourceType(sourceType: VocabularySourceType) {
  return sourceType === 'practice' || sourceType === 'past-exam' ? sourceType : null
}

function sanitizeIsoDate(value: string | undefined) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function sanitizeOptionalString(value: string | undefined) {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}
