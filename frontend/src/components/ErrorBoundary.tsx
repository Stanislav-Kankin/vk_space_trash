import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icon28WarningTriangleOutline } from '@vkontakte/icons'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Game UI failed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="game-shell error-screen">
        <Icon28WarningTriangleOutline />
        <p>СИСТЕМНАЯ ОШИБКА</p>
        <h1>Связь с бортом потеряна</h1>
        <button className="primary-action" type="button" onClick={() => window.location.reload()}>
          Перезапустить систему
        </button>
      </main>
    )
  }
}
