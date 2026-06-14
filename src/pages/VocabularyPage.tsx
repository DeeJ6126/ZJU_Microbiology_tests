import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import type { VocabularyRecord, VocabularyStatus } from '../types'

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: '未掌握',
  learning: '复习中',
  mastered: '已掌握',
}

type VocabularyFilter = VocabularyStatus | 'all'

export function VocabularyPage() {
  const {
    vocabularyRecords,
    removeVocabularyRecord,
    updateVocabularyRecordStatus,
    clearVocabularyRecords,
    importVocabularyRecords,
  } = usePractice()
  const [filter, setFilter] = useState<VocabularyFilter>('all')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const filteredRecords = useMemo(
    () =>
      filter === 'all'
        ? vocabularyRecords
        : vocabularyRecords.filter((record) => record.status === filter),
    [filter, vocabularyRecords],
  )

  const statusCounts = vocabularyRecords.reduce<Record<VocabularyFilter, number>>(
    (counts, record) => {
      counts.all += 1
      counts[record.status] += 1
      return counts
    },
    { all: 0, new: 0, learning: 0, mastered: 0 },
  )

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'ZJU_Microbiology_tests',
      records: vocabularyRecords,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `microbiology-vocabulary-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as VocabularyRecord[] | { records?: VocabularyRecord[] }
      const records = Array.isArray(parsed) ? parsed : parsed.records

      if (!Array.isArray(records)) {
        setImportMessage('导入失败：文件里没有 records 数组。')
        return
      }

      importVocabularyRecords(records)
      setImportMessage(`已导入 ${records.length} 条记录；重复项会自动合并。`)
    } catch {
      setImportMessage('导入失败：请确认文件是有效的 JSON。')
    }
  }

  if (!vocabularyRecords.length) {
    return (
      <div className="page-stack">
        <section className="panel empty-state">
          <span className="eyebrow">Vocabulary notebook</span>
          <h1>生词本还是空的</h1>
          <p>
            进入练习或真题页面，打开“取词模式”，点击题干或选项中的英文词，就可以把它收入这里。
          </p>
          <div className="cta-row">
            <Link className="primary-button" to="/chapters">
              去练习里取词
            </Link>
            <Link className="ghost-button" to="/past-exams">
              去真题里取词
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Vocabulary notebook</span>
            <h1>生词本</h1>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button" onClick={handleExport} type="button">
              导出 JSON
            </button>
            <label className="ghost-button file-button">
              导入 JSON
              <input accept="application/json" onChange={handleImport} type="file" />
            </label>
            <button className="ghost-button" onClick={clearVocabularyRecords} type="button">
              清空生词本
            </button>
          </div>
        </div>

        <div className="selection-summary">
          {(['all', 'new', 'learning', 'mastered'] as VocabularyFilter[]).map((item) => (
            <button
              className={filter === item ? 'summary-pill is-active' : 'summary-pill'}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item === 'all' ? '全部' : STATUS_LABELS[item]}
              <strong>{statusCounts[item]}</strong>
            </button>
          ))}
        </div>

        <p className="scope-note">
          生词本保存在当前浏览器本地。换设备前建议导出 JSON，新设备打开网页后再导入。
        </p>

        {importMessage ? <p className="vocabulary-confirm">{importMessage}</p> : null}
      </section>

      <section className="vocabulary-grid">
        {filteredRecords.map((record) => (
          <article className="panel vocabulary-card" key={record.id}>
            <div className="vocabulary-card-top">
              <span className="chapter-chip">{getSourceLabel(record)}</span>
              <span className={`vocabulary-status status-${record.status}`}>
                {STATUS_LABELS[record.status]}
              </span>
            </div>

            <h2>{record.term}</h2>
            <p className="vocabulary-context">{record.contextText}</p>

            <div className="vocabulary-meta">
              <span>题号 {record.questionNumber}</span>
              {record.chapterId ? <span>Chapter {record.chapterId}</span> : null}
              {record.chapterTitle ? <span>{record.chapterTitle}</span> : null}
            </div>

            <div className="practice-actions">
              {(['new', 'learning', 'mastered'] as VocabularyStatus[]).map((status) => (
                <button
                  className={record.status === status ? 'secondary-button is-active' : 'ghost-button'}
                  key={status}
                  onClick={() => updateVocabularyRecordStatus(record.id, status)}
                  type="button"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
              <button
                className="ghost-button"
                onClick={() => removeVocabularyRecord(record.id)}
                type="button"
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function getSourceLabel(record: VocabularyRecord) {
  if (record.sourceType === 'past-exam') {
    return record.examId ? `真题 ${record.examId}` : '真题'
  }

  return record.chapterId ? `Chapter ${record.chapterId}` : '章节练习'
}
