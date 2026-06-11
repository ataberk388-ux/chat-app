import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { I18nProvider } from './lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, gcTime: 1000 * 60 * 5, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
