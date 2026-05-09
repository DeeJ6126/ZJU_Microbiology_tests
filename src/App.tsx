import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { PracticeProvider } from './context/PracticeContext'
import { useQuestionBank } from './hooks/useQuestionBank'
import { AboutPage } from './pages/AboutPage'
import { ChapterSelectionPage } from './pages/ChapterSelectionPage'
import { IntroPage } from './pages/IntroPage'
import { MistakesPage } from './pages/MistakesPage'
import { PastExamPaperPage } from './pages/PastExamPaperPage'
import { PastExamsPage } from './pages/PastExamsPage'
import { PracticePage } from './pages/PracticePage'
import { ResultsPage } from './pages/ResultsPage'

function App() {
  const { questionBank, loading, error, reload } = useQuestionBank()

  if (loading || !questionBank) {
    return (
      <div className="loading-screen">
        <div className="status-panel">
          <span className="eyebrow">Preparing practice deck</span>
          <h1>正在载入题库</h1>
          <p>正在读取章节题目、错题记录与练习配置，请稍候。</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-screen">
        <div className="status-panel">
          <span className="eyebrow">Data unavailable</span>
          <h1>题库加载失败</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={reload} type="button">
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <PracticeProvider questionBank={questionBank}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/chapters" element={<ChapterSelectionPage />} />
          <Route path="/past-exams" element={<PastExamsPage />} />
          <Route path="/past-exams/:examId" element={<PastExamPaperPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AppLayout>
    </PracticeProvider>
  )
}

export default App
