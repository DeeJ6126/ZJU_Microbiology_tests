import { Link, Navigate, useNavigate } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import { getScoreSummary } from '../lib/practice'

export function ResultsPage() {
  const {
    session,
    questionBank,
    mistakeRecords,
    restartPractice,
    clearSession,
  } = usePractice()
  const navigate = useNavigate()

  if (!session || !session.questionOrder.length) {
    return <Navigate replace to="/chapters" />
  }

  const scoreSummary = getScoreSummary(session)
  const selectedChapters = questionBank.chapters.filter((chapter) =>
    session.selectedChapterIds.includes(chapter.id),
  )

  function handleRestart() {
    const nextSession = restartPractice()

    if (nextSession) {
      navigate('/practice')
    }
  }

  function handleReturnToSelection() {
    clearSession()
    navigate('/chapters')
  }

  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Session summary</span>
            <h1>{session.mode === 'mistakes' ? '错题本练习结果' : '本轮练习结果'}</h1>
            <p className="lead">
              {session.title}
              {' '}
              已完成。本轮如果有答错的新题，已经自动沉淀到错题本；你可以直接继续错题重练，
              或回到章节页重新组合题池。
            </p>

            <div className="cta-row">
              <button className="primary-button" onClick={handleRestart} type="button">
                再来一次
              </button>
              <button
                className="secondary-button"
                onClick={handleReturnToSelection}
                type="button"
              >
                返回选章
              </button>
              <Link className="ghost-button" to="/mistakes">
                打开错题本
              </Link>
            </div>
          </div>

          <aside className="panel inset-panel">
            <span className="eyebrow">Score</span>
            <div className="result-spotlight">
              <strong>{scoreSummary.accuracy}%</strong>
              <span>正确率</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="result-grid">
        <article className="panel result-card">
          <span className="eyebrow">Total</span>
          <strong>{scoreSummary.total}</strong>
          <p>总题数</p>
        </article>
        <article className="panel result-card">
          <span className="eyebrow">Answered</span>
          <strong>{scoreSummary.answered}</strong>
          <p>已作答</p>
        </article>
        <article className="panel result-card">
          <span className="eyebrow">Correct</span>
          <strong>{scoreSummary.correct}</strong>
          <p>答对题数</p>
        </article>
        <article className="panel result-card">
          <span className="eyebrow">Mistakes</span>
          <strong>{mistakeRecords.length}</strong>
          <p>错题本累计题数</p>
        </article>
      </section>

      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Selected chapters</span>
            <h2>本轮章节</h2>
          </div>
        </div>

        <div className="chapter-pill-row">
          {selectedChapters.map((chapter) => (
            <span className="chapter-pill" key={chapter.id}>
              Chapter {chapter.id}: {chapter.title}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
