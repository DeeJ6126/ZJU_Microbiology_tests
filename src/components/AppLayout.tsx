import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { usePractice } from '../hooks/usePractice'
import { getScopedQuestionCount } from '../lib/chapterScope'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { questionBank, session, mistakeRecords } = usePractice()
  const answeredCount = session?.answers.length ?? 0
  const totalCount = session?.questionOrder.length ?? getScopedQuestionCount(questionBank)

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" aria-hidden="true"></div>
      <div className="ambient ambient-right" aria-hidden="true"></div>

      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">MB</div>
          <div className="brand-copy">
            <span className="eyebrow">Microbiology final review</span>
            <strong>期末选择题练习</strong>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary">
          <NavLink className={getNavClassName} end to="/">
            前言
          </NavLink>
          <NavLink className={getNavClassName} to="/chapters">
            章节
          </NavLink>
          <NavLink className={getNavClassName} to="/past-exams">
            真题
          </NavLink>
          <NavLink className={getNavClassName} to="/practice">
            练习
          </NavLink>
          <NavLink className={getNavClassName} to="/mistakes">
            错题本
          </NavLink>
          <NavLink className={getNavClassName} to="/results">
            结果
          </NavLink>
          <NavLink className={getNavClassName} to="/about">
            关于
          </NavLink>
        </nav>

        <div className="status-group">
          <div className="status-pill">
            <span>作答进度</span>
            <strong>
              {answeredCount}/{totalCount}
            </strong>
          </div>
          <div className="status-pill">
            <span>错题本</span>
            <strong>{mistakeRecords.length}</strong>
          </div>
        </div>
      </header>

      <main className="page-shell">{children}</main>
    </div>
  )
}

function getNavClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link is-active' : 'nav-link'
}
