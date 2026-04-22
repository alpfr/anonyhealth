import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { TenantProvider } from './context/TenantContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
