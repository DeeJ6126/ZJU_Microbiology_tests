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
              当前网页用于期末复习，范围保留“今年教学大纲”和“去年 PPT”的并集章节：
              {' '}
              {scopedChapters.length}
              {' '}
              个章节、
              {' '}
              {scopedQuestionCount}
              {' '}
              道选择题。章节页会标明每章来自“大纲 + 去年”、“仅今年大纲”或“仅去年 PPT”。
            </p>

            <div className="cta-row">
              <Link className="primary-button" to="/chapters">
                开始选章
              </Link>
              <Link className="secondary-button" to="/past-exams">
                期中真题卷
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
                <strong>并集</strong>
                <span>今年大纲 + 去年 PPT</span>
              </article>
            </div>
            <p className="panel-note">题库今日已整理完成，适合期末集中复习。</p>
          </aside>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel feature-card">
          <span className="eyebrow">01</span>
          <h2>范围更贴近期末</h2>
          <p>章节练习保留今年大纲与去年 PPT 至少出现过一次的内容，减少无关章节干扰。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">02</span>
          <h2>来源标记清楚</h2>
          <p>每个章节都会显示它是“大纲 + 去年”、“仅今年大纲”还是“仅去年 PPT”。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">03</span>
          <h2>期中卷单独入口</h2>
          <p>两套期中真题卷会按整张试卷保留原顺序展示，可直接按卷练习，不会和章节混在一起。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">04</span>
          <h2>错题自动沉淀</h2>
          <p>答错的题会自动进入本地错题本，可在手机上随时回看或单独再练。</p>
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
            <p>先确认哪些章节同时或分别出现在今年大纲、去年 PPT 中。</p>
          </article>
          <article className="timeline-step">
            <strong>选章节</strong>
            <p>勾选一个或多个范围内章节，开始本轮随机练习。</p>
          </article>
          <article className="timeline-step">
            <strong>刷选择题</strong>
            <p>一次一题，点击选项后立刻显示正确答案与反馈。</p>
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
