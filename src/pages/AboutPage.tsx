const aboutItems = [
  {
    label: '教学班级',
    value: '2026年春夏 - 吕镇梅班',
  },
  {
    label: '作者',
    value: '生物科学2402 蒋贤迪',
  },
  {
    label: '反馈邮箱',
    value: '1498607332@qq.com',
  },
]

export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="panel hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">About this site</span>
            <h1>关于本题库</h1>
            <p className="lead">
              本网页用于微生物学期末复习，整理章节选择题、历年真题和错题重练功能，方便在电脑和手机端进行自测。
            </p>
          </div>

          <aside className="panel inset-panel about-card">
            <span className="eyebrow">Contact</span>
            <div className="about-list">
              {aboutItems.map((item) => (
                <div className="about-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="feature-grid about-grid">
        <article className="panel feature-card">
          <span className="eyebrow">Purpose</span>
          <h2>学习交流</h2>
          <p>本项目仅用于课程复习、学习交流与自我检测，不用于商业用途。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">Content</span>
          <h2>内容来源</h2>
          <p>题目内容主要整理自课程复习资料、章节练习题和历年试卷，页面保留英文题干以便贴近原题。</p>
        </article>

        <article className="panel feature-card">
          <span className="eyebrow">Feedback</span>
          <h2>欢迎反馈</h2>
          <p>如果发现答案、解析、排版或功能问题，可以通过邮箱反馈，后续会继续修正和完善。</p>
        </article>
      </section>
    </div>
  )
}
