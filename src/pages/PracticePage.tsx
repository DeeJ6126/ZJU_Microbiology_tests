import { Link, Navigate, useNavigate } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import { findAnswer, getPdfHref, getScoreSummary } from '../lib/practice'
import type { OptionKey } from '../types'

export function PracticePage() {
  const {
    session,
    questionBank,
    mistakeRecords,
    recordAnswer,
    restartPractice,
    goToIndex,
    keepMistake,
    removeMistake,
    hasMistake,
    getQuestionById,
  } = usePractice()
  const navigate = useNavigate()

  if (!session || !session.questionOrder.length) {
    return <Navigate replace to="/chapters" />
  }

  const practiceSession = session
  const questionId = practiceSession.questionOrder[practiceSession.currentIndex]
  const question = getQuestionById(questionId)

  if (!question) {
    return <Navigate replace to="/chapters" />
  }

  const currentQuestion = question
  const answer = findAnswer(practiceSession, currentQuestion.id)
  const explanation = currentQuestion.aiExplanation
  const scoreSummary = getScoreSummary(practiceSession)
  const chapterLabel = questionBank.chapters.find(
    (chapter) => chapter.id === currentQuestion.chapterId,
  )
  const isInMistakes = hasMistake(currentQuestion.id)
  const isIncorrectAnswer = Boolean(answer && !answer.isCorrect)
  const isUnknownAnswer = answer?.selectedKey === 'UNKNOWN'
  const isMistakeDrill = practiceSession.mode === 'mistakes'

  function handleOptionClick(optionKey: OptionKey) {
    if (!answer) {
      recordAnswer(currentQuestion.id, optionKey)
    }
  }

  function handleUnknownClick() {
    if (!answer) {
      recordAnswer(currentQuestion.id, 'UNKNOWN')
    }
  }

  function handleNext() {
    if (practiceSession.currentIndex >= practiceSession.questionOrder.length - 1) {
      navigate('/results')
      return
    }

    goToIndex(practiceSession.currentIndex + 1)
  }

  function handlePrevious() {
    goToIndex(practiceSession.currentIndex - 1)
  }

  function handleRestart() {
    const nextSession = restartPractice()

    if (nextSession) {
      navigate('/practice')
    }
  }

  function handleKeepMistake() {
    if (answer) {
      keepMistake(currentQuestion.id, answer.selectedKey)
    }
  }

  return (
    <div className="page-stack page-with-dock">
      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {practiceSession.mode === 'mistakes' ? 'Mistake drill' : 'Practice mode'}
            </span>
            <h1>{practiceSession.title}</h1>
          </div>
          <div className="selection-summary">
            <div className="summary-pill">
              进度 <strong>{practiceSession.currentIndex + 1}</strong> / {scoreSummary.total}
            </div>
            <div className="summary-pill">
              已答 <strong>{scoreSummary.answered}</strong>
            </div>
            <div className="summary-pill">
              错题本 <strong>{mistakeRecords.length}</strong>
            </div>
          </div>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span
            className="progress-fill"
            style={{
              width: `${((practiceSession.currentIndex + 1) / scoreSummary.total) * 100}%`,
            }}
          ></span>
        </div>
      </section>

      <section className="panel question-panel">
        <div className="question-meta">
          <span className="chapter-chip">Chapter {currentQuestion.chapterId}</span>
          <span className="summary-pill">
            原题号 <strong>{currentQuestion.number}</strong>
          </span>
          {chapterLabel ? <span className="summary-pill">{chapterLabel.title}</span> : null}
          {isInMistakes ? <span className="summary-pill">已在错题本</span> : null}
        </div>

        <h2 className="question-text">{currentQuestion.prompt}</h2>

        {currentQuestion.hasFigure ? (
          <a
            className="info-link"
            href={getPdfHref(currentQuestion.sourcePdf, currentQuestion.sourcePage)}
            rel="noreferrer"
            target="_blank"
          >
            查看原题图示
          </a>
        ) : null}

        <div className="option-list">
          {currentQuestion.options.map((option) => (
            <button
              className={getOptionClassName(
                option.key,
                currentQuestion.answerKey,
                answer?.selectedKey === 'UNKNOWN' ? undefined : answer?.selectedKey,
              )}
              disabled={Boolean(answer)}
              key={option.key}
              onClick={() => handleOptionClick(option.key)}
              type="button"
            >
              <span className="option-key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          ))}
        </div>

        {!answer ? (
          <div className="practice-actions">
            <button className="ghost-button" onClick={handleUnknownClick} type="button">
              不知道
            </button>
          </div>
        ) : null}

        <div className={answer ? 'answer-banner is-visible' : 'answer-banner'}>
          {answer ? (
            <>
              <strong>
                {isUnknownAnswer
                  ? '已标记为不知道'
                  : answer.isCorrect
                    ? '回答正确'
                    : '回答错误'}
              </strong>
              <p>
                正确答案：{currentQuestion.answerKey}。你选择的是
                {' '}
                {isUnknownAnswer ? '不知道' : answer.selectedKey}
                。
              </p>
              {explanation ? (
                <div className="explanation-panel">
                  <span className="eyebrow">AI 解析</span>
                  <p>{explanation.explanation}</p>
                  <div className="option-explanation-list">
                    {currentQuestion.options.map((option) => (
                      <p key={option.key}>
                        <strong>{option.key}.</strong>
                        {' '}
                        {explanation.optionExplanations[option.key]}
                      </p>
                    ))}
                  </div>
                  <small>
                    由 {explanation.model} 生成，可信度：{explanation.confidence}
                  </small>
                </div>
              ) : (
                <p>这道题暂时还没有生成 AI 解析。</p>
              )}
              {isMistakeDrill ? (
                <div className="mistake-decision-panel">
                  <p>
                    这道题来自错题本。无论本次答对或答错，都由你决定是否继续保留。
                  </p>
                  <p>
                    当前状态：{isInMistakes ? '保留在错题本' : '已从错题本移除'}。
                  </p>
                  <div className="practice-actions">
                    <button
                      className="secondary-button"
                      onClick={handleKeepMistake}
                      type="button"
                    >
                      {isInMistakes ? '继续保留' : '重新保留到错题本'}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!isInMistakes}
                      onClick={() => removeMistake(currentQuestion.id)}
                      type="button"
                    >
                      从错题本移除
                    </button>
                  </div>
                </div>
              ) : isUnknownAnswer ? (
                <p>这道题已按未掌握处理，并已加入错题本，后续可在错题练习里重新作答。</p>
              ) : isIncorrectAnswer ? (
                <p>这道题已经加入错题本，你可以稍后在手机上单独重练。</p>
              ) : (
                <p>继续下一题，保持这轮乱序练习的节奏。</p>
              )}
            </>
          ) : (
            <>
              <strong>等待作答</strong>
              <p>点击任一选项后，会立即显示对错与标准答案；答错会自动记入错题本。</p>
            </>
          )}
        </div>

        <div className="practice-actions desktop-action-row">
          <button
            className="secondary-button"
            disabled={practiceSession.currentIndex === 0}
            onClick={handlePrevious}
            type="button"
          >
            上一题
          </button>

          <button className="primary-button" onClick={handleNext} type="button">
            {practiceSession.currentIndex === practiceSession.questionOrder.length - 1
              ? '查看结果'
              : '下一题'}
          </button>

          <button className="ghost-button" onClick={handleRestart} type="button">
            重新乱序开始
          </button>

          <Link className="ghost-button" to="/mistakes">
            错题本
          </Link>

          <Link className="ghost-button" to="/chapters">
            返回选章
          </Link>
        </div>
      </section>

      <div className="mobile-dock mobile-dock-actions">
        <button
          className="secondary-button"
          disabled={practiceSession.currentIndex === 0}
          onClick={handlePrevious}
          type="button"
        >
          上一题
        </button>
        <button className="primary-button" onClick={handleNext} type="button">
          {practiceSession.currentIndex === practiceSession.questionOrder.length - 1
            ? '结果'
            : '下一题'}
        </button>
      </div>
    </div>
  )
}

function getOptionClassName(
  optionKey: OptionKey,
  answerKey: OptionKey,
  selectedKey?: OptionKey,
) {
  if (!selectedKey) {
    return 'option-button'
  }

  if (optionKey === answerKey) {
    return 'option-button is-correct'
  }

  if (optionKey === selectedKey) {
    return 'option-button is-incorrect'
  }

  return 'option-button is-muted'
}
