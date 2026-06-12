import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Home } from 'lucide-react'
import toast from 'react-hot-toast'

const floatingIcons = ['🏠', '🛋️', '🪴', '🖼️', '💡', '🪟', '🛏️', '🚿', '🧹', '🔑']

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
    <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden relative">

      {/* Floating background icons */}
      {floatingIcons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl select-none pointer-events-none"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 50,
            opacity: 0,
            rotate: 0
          }}
          animate={{
            y: -100,
            opacity: [0, 0.4, 0.4, 0],
            rotate: Math.random() * 30 - 15
          }}
          transition={{
            duration: 6 + Math.random() * 6,
            delay: i * 0.8,
            repeat: Infinity,
            repeatDelay: Math.random() * 4,
            ease: 'easeInOut'
          }}
          style={{
            left: `${5 + (i * 9)}%`,
          }}
        >
          {icon}
        </motion.div>
      ))}

      {/* Animated background blobs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ top: '10%', left: '10%' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ bottom: '10%', right: '10%' }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-green-500/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 40, 0], scale: [1, 0.9, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ top: '50%', right: '20%' }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm border border-border rounded-2xl p-8 bg-background/80 backdrop-blur-sm relative z-10"
      >
        <motion.div
          className="flex items-center gap-2 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Home size={20} />
          </motion.div>
          <span className="font-semibold">Home hub</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-xl font-semibold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === 'login' ? 'Sign in to your home hub' : 'Set up your home hub account'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
          >
            <input
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="bg-primary text-primary-foreground rounded-lg py-2 text-sm mt-2 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-foreground underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
