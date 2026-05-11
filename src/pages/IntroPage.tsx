import { Link } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import { getScopedChapters, getScopedQuestionCount } from '../lib/chapterScope'

export function IntroPage() {
  const { questionBank, session, mistakeRecords } = usePractice()
  const scopedChapters = getScopedChapters(questionBank)
  const scopedQuestionCount = getScopedQuestionCount(questionBank)

  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Final review practice</span>
            <h1>微生物学期末选择题练习台</h1>
            <p className="lead">
              当前网页用于期末复习。已按老师核验后的 PPT 范围整理，共保留{' '}
              {scopedChapters.length} 个章节、{scopedQuestionCount}{' '}
              道选择题，适合按章节混练、真题自测和错题重练。
            </p>

            <div className="cta-row">
              <Link className="primary-button" to="/chapters">
                开始选章
              </Link>
              <Link className="secondary-button" to="/past-exams">
                历年真题卷
              </Link>
              {session ? (
                <Link className="ghost-button" to="/practice">
                  继续当前练习
                </Link>
              ) : null}
              <Link className="ghost-button" to="/mistakes">
                查看错题本
              </Link>
            </div>
          </div>

          <aside className="panel inset-panel">
            <span className="eyebrow">期末复习范围</span>
            <div className="metric-grid">
              <article className="metric-card">
                <strong>{scopedChapters.length}</strong>
                <span>复习章节</span>
              </article>
              <article className="metric-card">
                <strong>{scopedQuestionCount}</strong>
                <span>选择题</span>
              </article>
              <article className="metric-card">
                <strong>{mistakeRecords.length}</strong>
                <span>道错题已记录</span>
              </article>
              <article className="metric-card">
                <strong>PPT</strong>
                <span>老师核验范围</span>
              </article>
            </div>
            <p className="panel-note">题库今日已整理完成，适合期末集中复习。</p>
          </aside>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel feature-card">
          <span className="eyebrow">01</span>
          <h2>范围更明确</h2>
          <p>章节练习只保留确认需要复习的 PPT 章节，减少无关章节干扰。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">02</span>
          <h2>多章随机混练</h2>
          <p>可以自由选择一个或多个章节，进入练习后会一次性随机排序，切题时不会重新洗牌。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">03</span>
          <h2>真题卷单独入口</h2>
          <p>两套历年真题卷按整张试卷保留原顺序展示，可直接按卷练习。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">04</span>
          <h2>错题自动沉淀</h2>
          <p>答错或点击“不知道”的题会自动进入本地错题本，可在手机上单独重练。</p>
        </article>
      </section>

      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">How it works</span>
            <h2>使用流程</h2>
          </div>
          <Link className="ghost-button" to="/chapters">
            前往章节页
          </Link>
        </div>

        <div className="timeline-grid">
          <article className="timeline-step">
            <strong>看范围</strong>
            <p>先确认本次期末复习需要覆盖的 PPT 章节。</p>
          </article>
          <article className="timeline-step">
            <strong>选章节</strong>
            <p>勾选一个或多个章节，开始本轮随机练习。</p>
          </article>
          <article className="timeline-step">
            <strong>刷选择题</strong>
            <p>一次一题，点击选项后立即显示正确答案与解析。</p>
          </article>
          <article className="timeline-step">
            <strong>复盘错题</strong>
            <p>错题自动沉淀，可直接发起“只练错题”的移动端复习。</p>
          </article>
        </div>
      </section>
    </div>
  )
}
