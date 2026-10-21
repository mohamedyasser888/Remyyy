import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { PointsProvider } from './contexts/PointsContext'
import { I18nProvider } from '@/i18n'
import { ToastProvider } from './hooks/useToast'
import { ErrorBoundary } from './components/common'
import AppRoutes from './routes'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <AdminAuthProvider>
                <PointsProvider>
                  <AppRoutes />
                </PointsProvider>
              </AdminAuthProvider>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
