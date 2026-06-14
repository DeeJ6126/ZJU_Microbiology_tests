import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { VocabularyPicker } from '../components/VocabularyPicker'
import { usePastExamBank } from '../hooks/usePastExamBank'
import { usePractice } from '../hooks/usePractice'
import type { OptionKey, PastExam, PastExamQuestion } from '../types'

export function PastExamPaperPage() {
  const { examId } = useParams()
  const { pastExamBank, loading, error, reload } = usePastExamBank()
  const exam = pastExamBank?.exams.find((item) => item.id === examId) ?? null

  if (loading) {
    return (
      <div className="page-stack">
        <section className="status-panel">
          <span className="eyebrow">Midterm paper</span>
          <h1>正在载入试卷</h1>
          <p>真题数据已经存在，这里正在读取题目与解析。</p>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-stack">
        <section className="status-panel">
          <span className="eyebrow">Midterm paper</span>
          <h1>试卷载入失败</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={reload} type="button">
            重新加载
          </button>
        </section>
      </div>
    )
  }

  if (!pastExamBank || !examId || !exam) {
    return <Navigate replace to="/past-exams" />
  }

  return <PastExamPaperContent exam={exam} key={exam.id} />
}

function PastExamPaperContent({ exam }: { exam: PastExam }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, OptionKey>>({})
  const [isVocabularyMode, setIsVocabularyMode] = useState(false)
  const [lastVocabularyTerm, setLastVocabularyTerm] = useState<string | null>(null)
  const { addVocabularyRecord, vocabularyRecords } = usePractice()

  const safeIndex = Math.min(currentIndex, Math.max(exam.questions.length - 1, 0))
  const currentQuestion = exam.questions[safeIndex]
  const selectedKey = selectedAnswers[currentQuestion.number]
  const hasAnswer = Boolean(selectedKey)
  const correctCount = exam.questions.filter((question) => {
    const selected = selectedAnswers[question.number]
    return selected && question.answerKey && selected === question.answerKey
  }).length
  const answeredCount = Object.keys(selectedAnswers).length

  function handleOptionClick(optionKey: OptionKey) {
    if (isVocabularyMode) {
      return
    }

    setSelectedAnswers((current) => {
      if (current[currentQuestion.number]) {
        return current
      }

      return {
        ...current,
        [currentQuestion.number]: optionKey,
      }
    })
  }

  function handleRestart() {
    setCurrentIndex(0)
    setSelectedAnswers({})
  }

  function handleNext() {
    setCurrentIndex((current) => Math.min(current + 1, exam.questions.length - 1))
  }

  function handlePrevious() {
    setCurrentIndex((current) => Math.max(current - 1, 0))
  }

  function handleVocabularyPick(term: string, contextText: string) {
    const record = addVocabularyRecord({
      term,
      contextText,
      sourceType: 'past-exam',
      examId: exam.id,
      questionNumber: currentQuestion.number,
    })

    if (record) {
      setLastVocabularyTerm(record.term)
    }
  }

  return (
    <div className="page-stack page-with-dock">
      <section className="panel compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Midterm paper</span>
            <h1>{exam.title}</h1>
          </div>
          <div className="selection-summary">
            <div className="summary-pill">
              进度 <strong>{safeIndex + 1}</strong> / {exam.questions.length}
            </div>
            <div className="summary-pill">
              已答 <strong>{answeredCount}</strong>
            </div>
            <div className="summary-pill">
              答对 <strong>{correctCount}</strong>
            </div>
            <div className="summary-pill">
              生词 <strong>{vocabularyRecords.length}</strong>
            </div>
          </div>
        </div>

        <div className="progress-track" aria-hidden="true">
          <span
            className="progress-fill"
            style={{
              width: `${((safeIndex + 1) / exam.questions.length) * 100}%`,
            }}
          ></span>
        </div>
      </section>

      <section className="panel question-panel">
        <div className="question-meta">
          <span className="chapter-chip">{exam.sourcePdf}</span>
          <span className="summary-pill">
            题号 <strong>{currentQuestion.number}</strong>
          </span>
          <span className="summary-pill">
            匹配 <strong>{getMatchLabel(currentQuestion)}</strong>
          </span>
          <button
            className={isVocabularyMode ? 'secondary-button is-active' : 'ghost-button'}
            onClick={() => setIsVocabularyMode((current) => !current)}
            type="button"
          >
            {isVocabularyMode ? '退出取词' : '取词模式'}
          </button>
        </div>

        <h2 className="question-text">
          <VocabularyPicker
            enabled={isVocabularyMode}
            onPick={(term) => handleVocabularyPick(term, currentQuestion.prompt)}
            text={currentQuestion.prompt}
          />
        </h2>

        {isVocabularyMode ? (
          <div className="vocabulary-tip">
            <strong>取词模式已开启</strong>
            <span>点题干或选项里的英文词即可加入生词本；此时不会提交答案。</span>
          </div>
        ) : null}

        {lastVocabularyTerm ? (
          <div className="vocabulary-confirm">
            已加入生词本：<strong>{lastVocabularyTerm}</strong>
            <Link to="/vocabulary">查看生词本</Link>
          </div>
        ) : null}

        <div className="option-list">
          {currentQuestion.options.map((option) =>
            isVocabularyMode ? (
              <div
                className={`${getOptionClassName(
                  option.key,
                  currentQuestion.answerKey,
                  selectedKey,
                )} is-pickable`}
                key={option.key}
              >
                <span className="option-key">{option.key}</span>
                <span>
                  <VocabularyPicker
                    enabled
                    onPick={(term) => handleVocabularyPick(term, option.text)}
                    text={option.text}
                  />
                </span>
              </div>
            ) : (
              <button
                className={getOptionClassName(
                  option.key,
                  currentQuestion.answerKey,
                  selectedKey,
                )}
                disabled={hasAnswer}
                key={option.key}
                onClick={() => handleOptionClick(option.key)}
                type="button"
              >
                <span className="option-key">{option.key}</span>
                <span>{option.text}</span>
              </button>
            ),
          )}
        </div>

        <div className={hasAnswer ? 'answer-banner is-visible' : 'answer-banner'}>
          {hasAnswer ? (
            currentQuestion.answerKey ? (
              <>
                <strong>
                  {selectedKey === currentQuestion.answerKey ? '回答正确' : '回答错误'}
                </strong>
                <p>
                  正确答案：{currentQuestion.answerKey}。你选择的是 {selectedKey}。
                </p>
                {currentQuestion.aiExplanation ? (
                  <div className="explanation-panel">
                    <span className="eyebrow">AI 解析</span>
                    <p>{currentQuestion.aiExplanation.explanation}</p>
                    <div className="option-explanation-list">
                      {currentQuestion.options.map((option) => (
                        <p key={option.key}>
                          <strong>{option.key}.</strong>{' '}
                          {currentQuestion.aiExplanation?.optionExplanations[option.key]}
                        </p>
                      ))}
                    </div>
                    <small>
                      由 {currentQuestion.aiExplanation.model} 生成，可置信度：
                      {currentQuestion.aiExplanation.confidence}
                    </small>
                  </div>
                ) : (
                  <p>这道题目前有答案，但还没有可展示的解析。</p>
                )}
              </>
            ) : (
              <>
                <strong>已记录你的选择</strong>
                <p>这道题目前还没有标准答案，暂时无法判定对错。</p>
              </>
            )
          ) : (
            <>
              <strong>等待作答</strong>
              <p>点击任一选项后，会立即显示答案和解析。</p>
            </>
          )}
        </div>

        <div className="practice-actions desktop-action-row">
          <button
            className="secondary-button"
            disabled={safeIndex === 0}
            onClick={handlePrevious}
            type="button"
          >
            上一题
          </button>

          <button
            className="primary-button"
            disabled={safeIndex === exam.questions.length - 1}
            onClick={handleNext}
            type="button"
          >
            下一题
          </button>

          <button className="ghost-button" onClick={handleRestart} type="button">
            重新开始
          </button>

          <Link className="ghost-button" to="/vocabulary">
            生词本
          </Link>

          <Link className="ghost-button" to="/past-exams">
            返回试卷列表
          </Link>
        </div>
      </section>

      <div className="mobile-dock mobile-dock-actions">
        <button
          className="secondary-button"
          disabled={safeIndex === 0}
          onClick={handlePrevious}
          type="button"
        >
          上一题
        </button>
        <button
          className="primary-button"
          disabled={safeIndex === exam.questions.length - 1}
          onClick={handleNext}
          type="button"
        >
          下一题
        </button>
      </div>
    </div>
  )
}

function getMatchLabel(question: PastExamQuestion) {
  if (question.match.type === 'exact') {
    return '原题命中'
  }

  if (question.match.type === 'high') {
    return '高置信匹配'
  }

  if (question.match.type === 'review') {
    return '待人工复核'
  }

  return 'AI 补全'
}

function getOptionClassName(
  optionKey: OptionKey,
  answerKey: OptionKey | null,
  selectedKey?: OptionKey,
) {
  if (!selectedKey || !answerKey) {
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
