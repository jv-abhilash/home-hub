import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/index'
import { PiggyBank, ClipboardList, Users, Wrench, Palette, MessageCircle, Home, LogOut, Sun, Moon, Wallet } from 'lucide-react'

const nav = [
  { to: '/mainfunds',   icon: Wallet,        label: 'Main funds' },
  { to: '/fund',        icon: PiggyBank,     label: 'Fund tracker' },
  { to: '/planner',     icon: ClipboardList, label: 'Move-in planner' },
  { to: '/guests',      icon: Users,         label: 'Guests' },
  { to: '/maintenance', icon: Wrench,        label: 'Maintenance' },
  { to: '/interior',    icon: Palette,       label: 'Interior design' },
]

export default function Sidebar({ onSignOut, user }) {
  const { chatOpen, setChatOpen, setActiveModule, darkMode, toggleDarkMode } = useAppStore()

  return (
    <motion.aside
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-56 border-r border-border flex flex-col py-6 px-3 gap-1 shrink-0"
    >
      <motion.div
        className="flex items-center gap-2 px-3 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
        >
          <Home size={20} />
        </motion.div>
        <span className="font-semibold text-sm">Home hub</span>
      </motion.div>

      {nav.map(({ to, icon: Icon, label }, i) => (
        <motion.div
          key={to}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.07 }}
        >
          <NavLink
            to={to}
            onClick={() => setActiveModule(to.slice(1))}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
              ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'}`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div animate={isActive ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Icon size={16} />
                </motion.div>
                {label}
              </>
            )}
          </NavLink>
        </motion.div>
      ))}

      <div className="mt-auto flex flex-col gap-1">
        <motion.button whileHover={{ x: 4 }} onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <MessageCircle size={16} /> Ask AI
        </motion.button>

        <motion.button whileHover={{ x: 4 }} onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <motion.div animate={{ rotate: darkMode ? 0 : 180 }} transition={{ duration: 0.4 }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </motion.div>
          {darkMode ? 'Light mode' : 'Dark mode'}
        </motion.button>

        <div className="px-3 py-2 border-t border-border mt-1">
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
          <motion.button whileHover={{ x: 4 }} onClick={onSignOut}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={14} /> Sign out
          </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}
