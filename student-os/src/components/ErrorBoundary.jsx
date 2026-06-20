import { Component } from 'react'

// Catches render errors in a subtree so one broken view (e.g. the note editor)
// doesn't white-screen the whole app. Key it by the thing being rendered so a
// fresh mount resets the error when the user navigates elsewhere.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info) }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {this.props.label || 'Something went wrong'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', wordBreak: 'break-word' }}>
          {String(this.state.error?.message || this.state.error)}
        </p>
        <button className="btn-press" onClick={this.reset} style={{
          marginTop: 16, padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
        }}>Try again</button>
      </div>
    )
  }
}
