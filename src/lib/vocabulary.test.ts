import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createVocabularyRecord,
  mergeVocabularyRecords,
  sanitizeVocabularyRecords,
  tokenizeVocabularyText,
} from './vocabulary.ts'
import type { VocabularyRecord } from '../types.ts'

test('tokenizeVocabularyText keeps microbiology terms clickable', () => {
  const tokens = tokenizeVocabularyText(
    'Gram-negative bacteria use NADP+ and 16S rRNA; T4 bacteriophage injects DNA.',
  )
  const terms = tokens.filter((token) => token.kind === 'term').map((token) => token.value)

  assert.deepEqual(terms, [
    'Gram-negative',
    'bacteria',
    'use',
    'NADP+',
    'and',
    '16S',
    'rRNA',
    'T4',
    'bacteriophage',
    'injects',
    'DNA',
  ])
})

test('createVocabularyRecord normalizes the term and preserves source context', () => {
  const record = createVocabularyRecord({
    term: ' Biofilms ',
    contextText: 'Bacteria may grow on devices as biofilms.',
    sourceType: 'practice',
    questionId: 'chapter-01-q-052',
    questionNumber: 52,
    chapterId: 1,
    chapterTitle: 'The Microbial World',
  })

  assert.equal(record.term, 'Biofilms')
  assert.equal(record.normalizedTerm, 'biofilms')
  assert.equal(record.status, 'new')
  assert.equal(record.sourceType, 'practice')
  assert.equal(record.questionId, 'chapter-01-q-052')
  assert.match(record.id, /^biofilms-practice-chapter-01-q-052-/)
})

test('sanitizeVocabularyRecords removes invalid entries and sorts newest first', () => {
  const records = sanitizeVocabularyRecords([
    {
      id: 'old',
      term: 'biofilm',
      normalizedTerm: 'biofilm',
      contextText: 'biofilm context',
      sourceType: 'practice',
      questionNumber: 1,
      status: 'learning',
      addedAt: '2026-06-13T00:00:00.000Z',
      updatedAt: '2026-06-13T00:00:00.000Z',
    },
    { id: 'bad', term: ' ', normalizedTerm: '', contextText: '', sourceType: 'practice' },
    {
      id: 'new',
      term: 'capsule',
      normalizedTerm: 'capsule',
      contextText: 'capsule context',
      sourceType: 'past-exam',
      examId: 'midterm-25',
      questionNumber: 2,
      status: 'mastered',
      addedAt: '2026-06-14T00:00:00.000Z',
      updatedAt: '2026-06-14T00:00:00.000Z',
    },
  ] as VocabularyRecord[])

  assert.equal(records.length, 2)
  assert.equal(records[0].id, 'new')
  assert.equal(records[1].id, 'old')
})

test('mergeVocabularyRecords deduplicates by normalized term and source', () => {
  const existing = [
    {
      ...createVocabularyRecord({
        term: 'Biofilm',
        contextText: 'device biofilm',
        sourceType: 'practice',
        questionId: 'chapter-01-q-052',
        questionNumber: 52,
      }),
      addedAt: '2026-06-13T00:00:00.000Z',
      updatedAt: '2026-06-13T00:00:00.000Z',
    },
  ]
  const imported = [
    {
      ...existing[0],
      id: 'different-id',
      term: 'biofilm',
      status: 'mastered',
      updatedAt: '2026-06-14T00:00:00.000Z',
    },
    createVocabularyRecord({
      term: 'Archaella',
      contextText: 'archaella rotate',
      sourceType: 'past-exam',
      examId: 'midterm-25',
      questionNumber: 3,
    }),
  ] as VocabularyRecord[]

  const merged = mergeVocabularyRecords(existing, imported)
  const biofilm = merged.find((record) => record.normalizedTerm === 'biofilm')
  const archaella = merged.find((record) => record.normalizedTerm === 'archaella')

  assert.equal(merged.length, 2)
  assert.equal(biofilm?.status, 'mastered')
  assert.equal(archaella?.sourceType, 'past-exam')
})
