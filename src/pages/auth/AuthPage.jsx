import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Home } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!email || !password) return toast.error('Email and password required')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account created! You can now log in.')
        setMode('login')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm border border-border rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <Home size={20} />
          <span className="font-semibold">Home hub</span>
        </div>

        <h1 className="text-xl font-semibold mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === 'login' ? 'Sign in to your home hub' : 'Set up your home hub account'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-lg py-2 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-foreground underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
