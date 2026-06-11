import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Wrench, Plus, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { differenceInDays } from 'date-fns'

const fetchAppliances = async () => {
  const { data, error } = await supabase.from('appliances').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function statusBadge(nextService) {
  if (!nextService) return null
  const days = differenceInDays(new Date(nextService), new Date())
  if (days < 0)  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>
  if (days <= 30) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Due in {days}d</span>
  return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>
}

export default function MaintenancePage() {
  const qc = useQueryClient()
  const { data: appliances = [], isLoading } = useQuery({ queryKey: ['appliances'], queryFn: fetchAppliances })
  const [form, setForm] = useState({
    name: '', brand: '', purchase_date: '', warranty_until: '',
    last_service: '', next_service: '', notes: ''
  })
  const [showForm, setShowForm] = useState(false)

  const addAppliance = useMutation({
    mutationFn: async (item) => {
      const cleaned = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v || null]))
      const { error } = await supabase.from('appliances').insert(cleaned)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['appliances'])
      setForm({ name: '', brand: '', purchase_date: '', warranty_until: '', last_service: '', next_service: '', notes: '' })
      setShowForm(false)
      toast.success('Appliance added')
    },
    onError: () => toast.error('Failed to add')
  })

  const deleteAppliance = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('appliances').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['appliances'])
      toast.success('Deleted')
    }
  })

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.name) return toast.error('Name required')
    addAppliance.mutate(form)
  }

  const overdue = appliances.filter(a => a.next_service && differenceInDays(new Date(a.next_service), new Date()) < 0)
  const dueSoon = appliances.filter(a => a.next_service && differenceInDays(new Date(a.next_service), new Date()) >= 0 && differenceInDays(new Date(a.next_service), new Date()) <= 30)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench size={24} />
          <h1 className="text-2xl font-semibold">Maintenance log</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Add appliance
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total appliances</p>
          <p className="text-2xl font-semibold">{appliances.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-500 mb-1">Overdue service</p>
          <p className="text-2xl font-semibold text-red-600">{overdue.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 mb-1">Due within 30 days</p>
          <p className="text-2xl font-semibold text-amber-700">{dueSoon.length}</p>
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <AlertTriangle size={16} />
          {overdue.map(a => a.name).join(', ')} — service overdue
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Appliance name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Purchase date</label>
            <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Warranty until</label>
            <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              type="date" value={form.warranty_until} onChange={e => setForm({ ...form, warranty_until: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Last service</label>
            <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              type="date" value={form.last_service} onChange={e => setForm({ ...form, last_service: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Next service</label>
            <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              type="date" value={form.next_service} onChange={e => setForm({ ...form, next_service: e.target.value })} />
          </div>
          <input className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save appliance
          </button>
        </form>
      )}

      {/* Appliance list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {appliances.map(a => (
          <div key={a.id} className="bg-muted rounded-xl px-4 py-3 flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{a.name}</p>
                {statusBadge(a.next_service)}
              </div>
              <p className="text-xs text-muted-foreground">
                {a.brand && `${a.brand} · `}
                {a.purchase_date && `Bought: ${a.purchase_date} · `}
                {a.warranty_until && `Warranty: ${a.warranty_until}`}
              </p>
              {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
            </div>
            <button onClick={() => deleteAppliance.mutate(a.id)} className="text-muted-foreground hover:text-destructive mt-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!isLoading && appliances.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No appliances yet. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
