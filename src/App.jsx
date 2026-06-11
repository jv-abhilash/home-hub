import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/shared/Sidebar'
import ChatPanel from './components/shared/ChatPanel'
import FundPage from './pages/fund/FundPage'
import PlannerPage from './pages/planner/PlannerPage'
import GuestsPage from './pages/guests/GuestsPage'
import MaintenancePage from './pages/maintenance/MaintenancePage'
import InteriorPage from './pages/interior/InteriorPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/fund" replace />} />
              <Route path="/fund" element={<FundPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/guests" element={<GuestsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/interior" element={<InteriorPage />} />
            </Routes>
          </main>
          <ChatPanel />
        </div>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
