import { useState } from 'react'
import './App.css'
import Layout from './components/Layout'
import DomainsPage from './pages/DomainsPage'
import DomainDetailPage from './pages/DomainDetailPage'
import CalendarPage from './pages/CalendarPage'
import { initialDomains } from './data/domains'

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
  const [currentPage,    setCurrentPage]    = useState('domains')
  const [previousPage,   setPreviousPage]   = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [domains,        setDomains]        = useState(initialDomains)
  const [customCalendarEvents, setCustomCalendarEvents] = useState([])

  const handleNavigate = (page) => {
    setPreviousPage(currentPage)
    setCurrentPage(page)
    if (page !== 'domain-detail') setSelectedDomain(null)
  }

  const handleOpenDomain = (domain) => {
    setPreviousPage(currentPage)
    setSelectedDomain(domain)
    setCurrentPage('domain-detail')
  }

  const handleBack = () => {
    setSelectedDomain(null)
    setCurrentPage(previousPage || 'domains')
    setPreviousPage(null)
  }

  const handleCreateDomain = (domain) => {
    setDomains(prev => [...prev, domain])
  }

  const handleAddCalendarEvent = (event) => {
    setCustomCalendarEvents(prev => [...prev, event])
  }

  // Called from CalendarPage → EventDetailModal "View in Domains"
  const handleViewDomainById = (domainId) => {
    const domain = domains.find(d => d.id === domainId)
    if (domain) {
      setPreviousPage('calendar')
      setSelectedDomain(domain)
      setCurrentPage('domain-detail')
    }
  }

  // Linked custom events for a domain (from calendar)
  const linkedEventsFor = (domainId) =>
    customCalendarEvents.filter(ev => ev.domainId === domainId)

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {currentPage === 'domains' && (
        <DomainsPage
          domains={domains}
          customCalendarEvents={customCalendarEvents}
          onOpenDomain={handleOpenDomain}
          onCreateDomain={handleCreateDomain}
        />
      )}
      {currentPage === 'domain-detail' && selectedDomain && (
        <DomainDetailPage
          domain={selectedDomain}
          linkedEvents={linkedEventsFor(selectedDomain.id)}
          onBack={handleBack}
        />
      )}
      {currentPage === 'calendar' && (
        <CalendarPage
          domains={domains}
          customEvents={customCalendarEvents}
          onViewDomain={handleViewDomainById}
          onAddCalendarEvent={handleAddCalendarEvent}
        />
      )}
      {currentPage === 'study' && <ComingSoon label="Study Session" />}
      {currentPage === 'notes' && <ComingSoon label="Notes" />}
      {currentPage === 'todos' && <ComingSoon label="To Do List" />}
    </Layout>
  )
}
