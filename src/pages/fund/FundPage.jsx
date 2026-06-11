import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PiggyBank, Plus, Trash2, AlertTriangle, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const CATEGORIES = ['Renovation', 'Furniture', 'Appliances', 'EMI', 'Deposit', 'Utilities', 'Other']
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#64748b']

const fetchExpenses = async () => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

export default function FundPage() {
  const qc = useQueryClient()
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })

  const [form, setForm] = useState({ title: '', amount: '', category: 'Renovation', date: new Date().toISOString().slice(0,10), notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [budget, setBudget] = useState(() => localStorage.getItem('homeBudget') || '')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const addExpense = useMutation({
    mutationFn: async (exp) => {
      const { error } = await supabase.from('expenses').insert(exp)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['expenses'])
      setForm({ title: '', amount: '', category: 'Renovation', date: new Date().toISOString().slice(0,10), notes: '' })
      setShowForm(false)
      toast.success('Expense added')
    },
    onError: () => toast.error('Failed to add expense')
  })

  const deleteExpense = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['expenses'])
      toast.success('Deleted')
    }
  })

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthTotal = expenses
    .filter(e => e.date?.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0)

  const chartData = CATEGORIES.map(cat => ({
    name: cat,
    amount: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(d => d.amount > 0)

  const budgetNum = Number(budget)
  const budgetPercent = budgetNum > 0 ? Math.min((total / budgetNum) * 100, 100) : 0
  const isOverBudget = budgetNum > 0 && total > budgetNum
  const isNearBudget = budgetNum > 0 && !isOverBudget && budgetPercent >= 80

  function saveBudget() {
    if (!budgetInput || isNaN(Number(budgetInput))) return toast.error('Enter a valid amount')
    localStorage.setItem('homeBudget', budgetInput)
    setBudget(budgetInput)
    setBudgetInput('')
    setEditingBudget(false)
    toast.success('Budget set')
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.title || !form.amount) return toast.error('Title and amount required')
    addExpense.mutate({ ...form, amount: Number(form.amount) })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PiggyBank size={24} />
          <h1 className="text-2xl font-semibold">Fund tracker</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Add expense
        </button>
      </div>

      {/* Budget warning */}
      {isOverBudget && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={16} />
          Over budget by ₹{(total - budgetNum).toLocaleString()} — you have spent ₹{total.toLocaleString()} of ₹{budgetNum.toLocaleString()}
        </div>
      )}
      {isNearBudget && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} />
          Approaching budget — {Math.round(budgetPercent)}% used, ₹{(budgetNum - total).toLocaleString()} remaining
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total spent</p>
          <p className="text-2xl font-semibold">₹{total.toLocaleString()}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">This month</p>
          <p className="text-2xl font-semibold">₹{monthTotal.toLocaleString()}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-semibold">{expenses.length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Top category</p>
          <p className="text-2xl font-semibold">{chartData[0]?.name || '—'}</p>
        </div>
      </div>

      {/* Budget progress */}
      <div className="bg-muted rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">Home budget</span>
          </div>
          <button
            onClick={() => { setEditingBudget(!editingBudget); setBudgetInput(budget) }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {budget ? 'Edit' : 'Set budget'}
          </button>
        </div>

        {editingBudget && (
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              placeholder="Total home budget in ₹"
              type="number"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveBudget()}
            />
            <button onClick={saveBudget} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
              Save
            </button>
          </div>
        )}

        {budgetNum > 0 ? (
          <>
            <div className="w-full bg-background rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{total.toLocaleString()} spent</span>
              <span>₹{budgetNum.toLocaleString()} budget</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Set a budget to track your spending progress</p>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Amount (₹)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save expense
          </button>
        </form>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-muted rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3">Spending by category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="amount" radius={[4,4,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {expenses.map(e => (
          <div key={e.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{e.title}</span>
              <span className="text-xs text-muted-foreground">{e.category} · {e.date}</span>
              {e.notes && <span className="text-xs text-muted-foreground">{e.notes}</span>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold">₹{Number(e.amount).toLocaleString()}</span>
              <button onClick={() => deleteExpense.mutate(e.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && expenses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No expenses yet. Add your first one.</p>
        )}
      </div>
    </div>
  )
}
