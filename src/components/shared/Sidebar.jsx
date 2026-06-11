import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/index'
import {
  PiggyBank, ClipboardList, Users, Wrench, Palette, MessageCircle, Home
} from 'lucide-react'

const nav = [
  { to: '/fund',        icon: PiggyBank,     label: 'Fund tracker' },
  { to: '/planner',     icon: ClipboardList, label: 'Move-in planner' },
  { to: '/guests',      icon: Users,         label: 'Guests' },
  { to: '/maintenance', icon: Wrench,        label: 'Maintenance' },
  { to: '/interior',    icon: Palette,       label: 'Interior design' },
]

export default function Sidebar() {
  const { chatOpen, setChatOpen, setActiveModule } = useAppStore()

  return (
    <aside className="w-56 border-r border-border flex flex-col py-6 px-3 gap-1 shrink-0">
      <div className="flex items-center gap-2 px-3 mb-6">
        <Home size={20} />
        <span className="font-semibold text-sm">Home hub</span>
      </div>

      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setActiveModule(to.slice(1))}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            ${isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full
            text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MessageCircle size={16} />
          Ask AI
        </button>
      </div>
    </aside>
  )
}
