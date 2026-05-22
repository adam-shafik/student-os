import { useState } from 'react'
import './App.css'
import Layout from './components/Layout'
import SubjectsPage from './pages/SubjectsPage'
import SubjectDetailPage from './pages/SubjectDetailPage'
import CalendarPage from './pages/CalendarPage'
import { subjects } from './data/subjects'

function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 400, gap: 12, color: '#4a4c60',
    }}>
      <div style={{
        fontSize: 40, background: '#14151e', border: '1px solid #1e2030',
        width: 72, height: 72, borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        🚧
      </div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#7c7e96' }}>{label}</h2>
      <p style={{ margin: 0, fontSize: 13, color: '#4a4c60' }}>Coming soon — this section is in development</p>
    </div>
  )
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('subjects')
  const [selectedSubject, setSelectedSubject] = useState(null)

  const handleNavigate = (page) => {
    setCurrentPage(page)
    if (page !== 'subjects' && page !== 'subject-detail') setSelectedSubject(null)
  }

  const handleOpenSubject = (subject) => {
    setSelectedSubject(subject)
    setCurrentPage('subject-detail')
  }

  const handleBack = () => {
    setSelectedSubject(null)
    setCurrentPage('subjects')
  }

  // Called from CalendarPage when user clicks "View in Subjects" on an event
  const handleViewSubjectById = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    if (subject) {
      setSelectedSubject(subject)
      setCurrentPage('subject-detail')
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'subjects' && (
        <SubjectsPage onOpenSubject={handleOpenSubject} />
      )}
      {currentPage === 'subject-detail' && selectedSubject && (
        <SubjectDetailPage subject={selectedSubject} onBack={handleBack} />
      )}
      {currentPage === 'calendar' && (
        <CalendarPage onViewSubject={handleViewSubjectById} />
      )}
      {currentPage === 'study' && <ComingSoon label="Study Session" />}
      {currentPage === 'notes' && <ComingSoon label="Notes" />}
      {currentPage === 'todos' && <ComingSoon label="To Do List" />}
    </Layout>
  )
}
