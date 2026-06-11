import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Users, Plus, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const RSVP_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-amber-100 text-amber-700',
  declined:  'bg-red-100 text-red-700',
}

const fetchGuests = async () => {
  const { data, error } = await supabase.from('guests').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function exportCSV(guests) {
  const headers = ['Name', 'Phone', 'RSVP', 'Dietary', 'Gift']
  const rows = guests.map(g => [
    g.name,
    g.phone || '',
    g.rsvp,
    g.dietary || '',
    g.gift || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `guests-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Guest list exported')
}

export default function GuestsPage() {
  const qc = useQueryClient()
  const { data: guests = [], isLoading } = useQuery({ queryKey: ['guests'], queryFn: fetchGuests })
  const [form, setForm] = useState({ name: '', phone: '', rsvp: 'pending', dietary: '', gift: '' })
  const [showForm, setShowForm] = useState(false)
  const [filterRsvp, setFilterRsvp] = useState('All')

  const addGuest = useMutation({
    mutationFn: async (guest) => {
      const { error } = await supabase.from('guests').insert(guest)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['guests'])
      setForm({ name: '', phone: '', rsvp: 'pending', dietary: '', gift: '' })
      setShowForm(false)
      toast.success('Guest added')
    },
    onError: () => toast.error('Failed to add guest')
  })

  const updateRsvp = useMutation({
    mutationFn: async ({ id, rsvp }) => {
      const { error } = await supabase.from('guests').update({ rsvp }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(['guests'])
  })

  const deleteGuest = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['guests'])
      toast.success('Removed')
    }
  })

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.name) return toast.error('Name required')
    addGuest.mutate(form)
  }

  const filtered = filterRsvp === 'All' ? guests : guests.filter(g => g.rsvp === filterRsvp.toLowerCase())
  const confirmed = guests.filter(g => g.rsvp === 'confirmed').length
  const pending   = guests.filter(g => g.rsvp === 'pending').length
  const declined  = guests.filter(g => g.rsvp === 'declined').length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={24} />
          <h1 className="text-2xl font-semibold">Guests & events</h1>
        </div>
        <div className="flex gap-2">
          {guests.length > 0 && (
            <button
              onClick={() => exportCSV(guests)}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download size={16} /> Export CSV
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
          >
            <Plus size={16} /> Add guest
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-semibold">{guests.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="text-xs text-green-600 mb-1">Confirmed</p>
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400">{confirmed}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">Pending</p>
          <p className="text-2xl font-semibold text-amber-700 dark:text-amber-400">{pending}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4">
          <p className="text-xs text-red-500 mb-1">Declined</p>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{declined}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <select className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            value={form.rsvp} onChange={e => setForm({ ...form, rsvp: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Dietary needs" value={form.dietary} onChange={e => setForm({ ...form, dietary: e.target.value })} />
          <input className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Gift (optional)" value={form.gift} onChange={e => setForm({ ...form, gift: e.target.value })} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save guest
          </button>
        </form>
      )}

      {/* RSVP filter */}
      <div className="flex gap-2 mb-4">
        {['All', 'Confirmed', 'Pending', 'Declined'].map(r => (
          <button key={r} onClick={() => setFilterRsvp(r)}
            className={`px-3 py-1 rounded-full text-xs transition-colors
              ${filterRsvp === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
            {r}
          </button>
        ))}
      </div>

      {/* Guest list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {filtered.map(g => (
          <div key={g.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground">
                {g.phone && `${g.phone} · `}
                {g.dietary && `${g.dietary} · `}
                {g.gift && `Gift: ${g.gift}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={g.rsvp}
                onChange={e => updateRsvp.mutate({ id: g.id, rsvp: e.target.value })}
                className={`text-xs px-2 py-1 rounded-full border-0 outline-none font-medium ${RSVP_COLORS[g.rsvp]}`}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
              </select>
              <button onClick={() => deleteGuest.mutate(g.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No guests yet. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
