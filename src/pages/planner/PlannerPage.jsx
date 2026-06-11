import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import toast from 'react-hot-toast'

const ROOMS = ['Living room', 'Kitchen', 'Bedroom', 'Bathroom', 'Balcony', 'Hall', 'Other']
const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_COLORS = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-green-500' }

const fetchTasks = async () => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function PlannerPage() {
  const qc = useQueryClient()
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })
  const [form, setForm] = useState({ title: '', room: 'Living room', priority: 'medium' })
  const [showForm, setShowForm] = useState(false)
  const [filterRoom, setFilterRoom] = useState('All')

  const addTask = useMutation({
    mutationFn: async (task) => {
      const { error } = await supabase.from('tasks').insert(task)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['tasks'])
      setForm({ title: '', room: 'Living room', priority: 'medium' })
      setShowForm(false)
      toast.success('Task added')
    },
    onError: () => toast.error('Failed to add task')
  })

  const toggleTask = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(['tasks'])
  })

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['tasks'])
      toast.success('Deleted')
    }
  })

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.title) return toast.error('Title required')
    addTask.mutate({ ...form, status: 'pending' })
  }

  const filtered = filterRoom === 'All' ? tasks : tasks.filter(t => t.room === filterRoom)
  const done = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} />
          <h1 className="text-2xl font-semibold">Move-in planner</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Add task
        </button>
      </div>

      {/* Progress */}
      <div className="bg-muted rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Overall progress</span>
          <span className="text-muted-foreground">{done} / {tasks.length} done</span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input
            className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Task title" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
          >
            {ROOMS.map(r => <option key={r}>{r}</option>)}
          </select>
          <select
            className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save task
          </button>
        </form>
      )}

      {/* Room filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['All', ...ROOMS].map(r => (
          <button
            key={r}
            onClick={() => setFilterRoom(r)}
            className={`px-3 py-1 rounded-full text-xs transition-colors
              ${filterRoom === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {filtered.map(t => (
          <div key={t.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors
            ${t.status === 'done' ? 'bg-muted/50 border-border/50 opacity-60' : 'bg-muted border-border'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleTask.mutate({ id: t.id, status: t.status === 'done' ? 'pending' : 'done' })}>
                {t.status === 'done'
                  ? <CheckCircle2 size={18} className="text-primary" />
                  : <Circle size={18} className="text-muted-foreground" />}
              </button>
              <div>
                <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.room} · <span className={PRIORITY_COLORS[t.priority]}>{t.priority}</span></p>
              </div>
            </div>
            <button onClick={() => deleteTask.mutate(t.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks yet. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
