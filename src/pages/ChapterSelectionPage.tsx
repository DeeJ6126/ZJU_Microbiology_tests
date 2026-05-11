import { useNavigate } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import { getScopedChapters, getScopedQuestionCount } from '../lib/chapterScope'

export function ChapterSelectionPage() {
  const {
    questionBank,
    selectedChapterIds,
    setSelectedChapterIds,
    beginPractice,
  } = usePractice()
  const navigate = useNavigate()

  const scopedChapters = getScopedChapters(questionBank)
  const scopedQuestionCount = getScopedQuestionCount(questionBank)
  const selectedSet = new Set(selectedChapterIds)
  const selectedQuestionCount = scopedChapters.reduce(
    (total, chapter) =>
      selectedSet.has(chapter.id) ? total + chapter.questionCount : total,
    0,
  )

  function toggleChapter(chapterId: number) {
    if (selectedSet.has(chapterId)) {
      setSelectedChapterIds(
        selectedChapterIds.filter((selectedId) => selectedId !== chapterId),
      )
      return
    }

    setSelectedChapterIds([...selectedChapterIds, chapterId])
  }

  function startPractice() {
    const nextSession = beginPractice(selectedChapterIds)

    if (nextSession) {
      navigate('/practice')
    }
  }

  return (
    <div className="page-stack page-with-dock">
      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Final chapter picker</span>
            <h1>选择期末复习章节</h1>
          </div>
          <div className="toolbar-actions">
            <button
              className="ghost-button"
              onClick={() =>
                setSelectedChapterIds(scopedChapters.map((chapter) => chapter.id))
              }
              type="button"
            >
              全选期末范围章节
            </button>
            <button
              className="ghost-button"
              onClick={() => setSelectedChapterIds([])}
              type="button"
            >
              清空
            </button>
          </div>
        </div>

        <p className="scope-note">
          已按老师核验后的 PPT 范围整理：去年 PPT 与今年 PPT 内容一致，因此这里只保留需要复习的章节。选择一个或多个章节后，会从所选章节中随机抽题练习。
        </p>

        <div className="selection-summary">
          <div className="summary-pill">
            复习章节 <strong>{scopedChapters.length}</strong>
          </div>
          <div className="summary-pill">
            已选章节 <strong>{selectedChapterIds.length}</strong>
          </div>
          <div className="summary-pill">
            本轮题量 <strong>{selectedQuestionCount}</strong>
          </div>
          <div className="summary-pill">
            期末题量 <strong>{scopedQuestionCount}</strong>
          </div>
        </div>

        <div className="cta-row desktop-only">
          <button
            className="primary-button"
            disabled={!selectedChapterIds.length}
            onClick={startPractice}
            type="button"
          >
            开始本轮练习
          </button>
        </div>
      </section>

      <section className="chapter-grid">
        {scopedChapters.map((chapter) => {
          const isSelected = selectedSet.has(chapter.id)

          return (
            <button
              className={isSelected ? 'chapter-card is-selected' : 'chapter-card'}
              key={chapter.id}
              onClick={() => toggleChapter(chapter.id)}
              type="button"
            >
              <div className="chapter-card-top">
                <span className="chapter-chip">Chapter {chapter.id}</span>
                <span className="chapter-count">{chapter.questionCount} 题</span>
              </div>

              <h2>{chapter.title}</h2>
              <p>
                来源 PDF：<code>{chapter.sourcePdf}</code>
              </p>

              <div className="chapter-card-footer">
                <span>{isSelected ? '已加入本轮练习' : '点击加入练习'}</span>
              </div>
            </button>
          )
        })}
      </section>

      <div className="mobile-dock">
        <div className="mobile-dock-copy">
          <span>已选 {selectedChapterIds.length} 章</span>
          <strong>{selectedQuestionCount} 题待练</strong>
        </div>
        <button
          className="primary-button"
          disabled={!selectedChapterIds.length}
          onClick={startPractice}
          type="button"
        >
          开始练习
        </button>
      </div>
    </div>
  )
}
