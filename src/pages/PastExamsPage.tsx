import { Link } from 'react-router-dom'
import { usePastExamBank } from '../hooks/usePastExamBank'

export function PastExamsPage() {
  const { pastExamBank, loading, error, reload } = usePastExamBank()

  if (loading || !pastExamBank) {
    return (
      <div className="page-stack">
        <section className="status-panel">
          <span className="eyebrow">Midterm papers</span>
          <h1>正在加载期中真题卷</h1>
          <p>题目和解析已经生成，这里正在读取两套期中卷的数据。</p>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="status-panel">
          <span className="eyebrow">Midterm papers</span>
          <h1>期中真题卷加载失败</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={reload} type="button">
            重新加载
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Midterm paper mode</span>
            <h1>期中真题卷练习</h1>
            <p className="lead">
              这里按整套期中卷进行练习。题目会保留试卷原顺序，点击选项后立即显示答案和解析。
            </p>
          </div>

          <aside className="panel inset-panel">
            <span className="eyebrow">数据概况</span>
            <div className="metric-grid">
              <article className="metric-card">
                <strong>{pastExamBank.exams.length}</strong>
                <span>套期中卷</span>
              </article>
              <article className="metric-card">
                <strong>
                  {pastExamBank.exams.reduce(
                    (total, exam) => total + exam.summary.totalQuestions,
                    0,
                  )}
                </strong>
                <span>总题数</span>
              </article>
              <article className="metric-card">
                <strong>
                  {pastExamBank.exams.reduce(
                    (total, exam) => total + exam.questions.filter((q) => q.answerKey).length,
                    0,
                  )}
                </strong>
                <span>已有答案</span>
              </article>
              <article className="metric-card">
                <strong>今日</strong>
                <span>已整理</span>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="exam-grid">
        {pastExamBank.exams.map((exam) => {
          const answered = exam.questions.filter((question) => question.answerKey).length
          const explained = exam.questions.filter((question) => question.aiExplanation).length

          return (
            <article className="panel exam-card" key={exam.id}>
              <div className="chapter-card-top">
                <span className="chapter-chip">{exam.title}</span>
                <span className="chapter-count">{exam.summary.totalQuestions} 题</span>
              </div>

              <div className="exam-card-body">
                <h2>{exam.sourcePdf}</h2>
                <p>
                  已有答案 {answered} 题，已有解析 {explained} 题，自动复用
                  {' '}
                  {exam.summary.autoFilled}
                  {' '}
                  题。
                </p>
              </div>

              <div className="chapter-pill-row">
                <span className="chapter-pill">精确命中 {exam.summary.exactMatches}</span>
                <span className="chapter-pill">高置信匹配 {exam.summary.highMatches}</span>
                <span className="chapter-pill">人工复核 {exam.summary.reviewMatches}</span>
              </div>

              <div className="chapter-card-footer">
                <span className="panel-note">试卷模式下按原顺序做题，点选后立即显示答案。</span>
                <Link className="primary-button" to={`/past-exams/${exam.id}`}>
                  进入试卷
                </Link>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
