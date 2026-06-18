import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/shared/Sidebar'
import ChatPanel from './components/shared/ChatPanel'
import PageTransition from './components/shared/PageTransition'
import AuthPage from './pages/auth/AuthPage'
import MainFundsPage from './pages/mainfunds/MainFundsPage'
import FundPage from './pages/fund/FundPage'
import PlannerPage from './pages/planner/PlannerPage'
import GuestsPage from './pages/guests/GuestsPage'
import MaintenancePage from './pages/maintenance/MaintenancePage'
import InteriorPage from './pages/interior/InteriorPage'

const queryClient = new QueryClient()

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/mainfunds" replace />} />
        <Route path="/mainfunds" element={<PageTransition><MainFundsPage /></PageTransition>} />
        <Route path="/fund" element={<PageTransition><FundPage /></PageTransition>} />
        <Route path="/planner" element={<PageTransition><PlannerPage /></PageTransition>} />
        <Route path="/guests" element={<PageTransition><GuestsPage /></PageTransition>} />
        <Route path="/maintenance" element={<PageTransition><MaintenancePage /></PageTransition>} />
        <Route path="/interior" element={<PageTransition><InteriorPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}

function AppShell() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar onSignOut={signOut} user={user} />
      <main className="flex-1 overflow-y-auto p-6">
        <AnimatedRoutes />
      </main>
      <ChatPanel />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
