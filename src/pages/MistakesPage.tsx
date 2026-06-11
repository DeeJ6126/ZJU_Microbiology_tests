import { Link, useNavigate } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'

export function MistakesPage() {
  const {
    mistakeRecords,
    beginMistakePractice,
    clearMistakes,
    removeMistake,
    getQuestionById,
  } = usePractice()
  const navigate = useNavigate()

  const mistakes = mistakeRecords
    .map((record) => ({
      record,
      question: getQuestionById(record.questionId),
    }))
    .filter(
      (
        item,
      ): item is {
        record: (typeof mistakeRecords)[number]
        question: NonNullable<ReturnType<typeof getQuestionById>>
      } => Boolean(item.question),
    )

  const chapterCounts = mistakes.reduce<Record<number, number>>((counts, item) => {
    counts[item.question.chapterId] = (counts[item.question.chapterId] ?? 0) + 1
    return counts
  }, {})

  function handleStartMistakePractice() {
    const nextSession = beginMistakePractice()

    if (nextSession) {
      navigate('/practice')
    }
  }

  if (!mistakes.length) {
    return (
      <div className="page-stack">
        <section className="panel empty-state">
          <span className="eyebrow">Mistake notebook</span>
          <h1>错题本还是空的</h1>
          <p>做题时答错的题会自动进入这里。这里不展示答案，只作为重新练习的错题池。</p>
          <div className="cta-row">
            <Link className="primary-button" to="/chapters">
              去选章练习
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
            <span className="eyebrow">Mistake notebook</span>
            <h1>错题本</h1>
          </div>
          <div className="toolbar-actions">
            <button className="primary-button" onClick={handleStartMistakePractice} type="button">
              开始重做错题
            </button>
            <button className="ghost-button" onClick={clearMistakes} type="button">
              清空错题本
            </button>
          </div>
        </div>

        <div className="selection-summary">
          <div className="summary-pill">
            错题数量 <strong>{mistakes.length}</strong>
          </div>
          <div className="summary-pill">
            覆盖章节 <strong>{Object.keys(chapterCounts).length}</strong>
          </div>
          <div className="summary-pill">
            使用方式 <strong>重做纠错</strong>
          </div>
        </div>

        <p className="scope-note">
          错题本只保留错题记录，不直接展示标准答案。点击“开始重做错题”后，会按错题池重新做一遍；
          在错题练习模式中，答题后可自行选择保留或移出错题本。
        </p>
      </section>

      <section className="mistake-grid">
        {mistakes.map(({ record, question }) => (
          <article className="panel mistake-card" key={record.questionId}>
            <div className="mistake-card-top">
              <span className="chapter-chip">Chapter {question.chapterId}</span>
              <span className="chapter-count">错了 {record.wrongCount} 次</span>
            </div>

            <h2 className="mistake-question">题号 {question.number}</h2>

            <div className="mistake-answer-row">
              <span className="mistake-answer-pill">
                最近一次选择 <strong>{record.lastSelectedKey === 'UNKNOWN' ? '不知道' : record.lastSelectedKey}</strong>
              </span>
              <span className="mistake-answer-pill">
                收录状态 <strong>已收录</strong>
              </span>
            </div>

            <p className="mistake-answer-text">
              这道题已加入错题池。进入错题练习后重新作答，可在看完答案后自行决定是否移出。
            </p>

            <div className="practice-actions">
              <button
                className="secondary-button"
                onClick={() => removeMistake(record.questionId)}
                type="button"
              >
                从错题本移除
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
