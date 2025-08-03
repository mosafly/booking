import { Component, ErrorInfo, ReactNode } from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'

interface Props extends WithTranslation {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    const { t } = this.props

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-6 rounded-md shadow-md max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              {t('errorBoundary.title')}
            </h2>
            <p className="text-gray-700 mb-4">{t('errorBoundary.message')}</p>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto mb-4">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary w-full"
            >
              {t('errorBoundary.refreshButton')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const ErrorBoundaryWithTranslation = withTranslation()(ErrorBoundary)
ErrorBoundaryWithTranslation.displayName = 'ErrorBoundaryWithTranslation'

export default ErrorBoundaryWithTranslation
