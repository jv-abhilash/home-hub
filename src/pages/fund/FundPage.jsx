import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PiggyBank, Plus, Trash2, AlertTriangle, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const CATEGORIES = ['Renovation', 'Furniture', 'Appliances', 'EMI', 'Deposit', 'Utilities', 'Salary', 'Gift', 'Other']
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#64748b','#f43f5e','#06b6d4']

const fetchExpenses = async () => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

export default function FundPage() {
  const qc = useQueryClient()
  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses })

  const [form, setForm] = useState({ title: '', amount: '', category: 'Renovation', date: new Date().toISOString().slice(0,10), notes: '', type: 'debit' })
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('debit')
  const [budget, setBudget] = useState(() => localStorage.getItem('homeBudget') || '')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [filterType, setFilterType] = useState('all')

  const addExpense = useMutation({
    mutationFn: async (exp) => {
      const { error } = await supabase.from('expenses').insert(exp)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['expenses'])
      setForm({ title: '', amount: '', category: 'Renovation', date: new Date().toISOString().slice(0,10), notes: '', type: formType })
      setShowForm(false)
      toast.success(formType === 'credit' ? 'Credit added' : 'Expense added')
    },
    onError: () => toast.error('Failed to add')
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

  const totalCredits = expenses.filter(e => e.type === 'credit').reduce((s, e) => s + Number(e.amount), 0)
  const totalDebits = expenses.filter(e => e.type === 'debit').reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalCredits - totalDebits

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthDebits = expenses
    .filter(e => e.date?.startsWith(thisMonth) && e.type === 'debit')
    .reduce((s, e) => s + Number(e.amount), 0)
  const monthCredits = expenses
    .filter(e => e.date?.startsWith(thisMonth) && e.type === 'credit')
    .reduce((s, e) => s + Number(e.amount), 0)

  const debitData = CATEGORIES.map(cat => ({
    name: cat,
    amount: expenses.filter(e => e.category === cat && e.type === 'debit').reduce((s, e) => s + Number(e.amount), 0)
  })).filter(d => d.amount > 0)

  const budgetNum = Number(budget)
  const budgetPercent = budgetNum > 0 ? Math.min((totalDebits / budgetNum) * 100, 100) : 0
  const isOverBudget = budgetNum > 0 && totalDebits > budgetNum
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
    addExpense.mutate({ ...form, amount: Number(form.amount), type: formType })
  }

  function openForm(type) {
    setFormType(type)
    setForm({ title: '', amount: '', category: type === 'credit' ? 'Salary' : 'Renovation', date: new Date().toISOString().slice(0,10), notes: '', type })
    setShowForm(true)
  }

  const filtered = filterType === 'all' ? expenses : expenses.filter(e => e.type === filterType)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PiggyBank size={24} />
          <h1 className="text-2xl font-semibold">Fund tracker</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openForm('credit')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <TrendingUp size={16} /> Add credit
          </button>
          <button
            onClick={() => openForm('debit')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
          >
            <TrendingDown size={16} /> Add debit
          </button>
        </div>
      </div>

      {/* Warnings */}
      {isOverBudget && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={16} />
          Over budget by ₹{(totalDebits - budgetNum).toLocaleString()} — spent ₹{totalDebits.toLocaleString()} of ₹{budgetNum.toLocaleString()}
        </div>
      )}
      {isNearBudget && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} />
          Approaching budget — {Math.round(budgetPercent)}% used, ₹{(budgetNum - totalDebits).toLocaleString()} remaining
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl p-4 ${balance >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className={`text-2xl font-semibold ${balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{balance >= 0 ? 'surplus' : 'deficit'}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-green-600 mb-1">Total credits</p>
          <p className="text-2xl font-semibold text-green-600">₹{totalCredits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">this month ₹{monthCredits.toLocaleString()}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-red-500 mb-1">Total debits</p>
          <p className="text-2xl font-semibold text-red-500">₹{totalDebits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">this month ₹{monthDebits.toLocaleString()}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-semibold">{expenses.length}</p>
          <p className="text-xs text-muted-foreground">{expenses.filter(e => e.type === 'debit').length} debits · {expenses.filter(e => e.type === 'credit').length} credits</p>
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
              <span>₹{totalDebits.toLocaleString()} spent</span>
              <span>₹{budgetNum.toLocaleString()} budget</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Set a budget to track your spending progress</p>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 border-2 ${formType === 'credit' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-primary/30 bg-muted'}`}>
          <div className="col-span-2 flex items-center gap-2 mb-1">
            {formType === 'credit'
              ? <TrendingUp size={16} className="text-green-600" />
              : <TrendingDown size={16} className="text-primary" />}
            <span className="text-sm font-medium">{formType === 'credit' ? 'Add credit (money in)' : 'Add debit (money out)'}</span>
          </div>
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
          <button type="submit" className={`col-span-2 rounded-lg py-2 text-sm text-white ${formType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-primary'}`}>
            Save {formType}
          </button>
        </form>
      )}

      {/* Chart */}
      {debitData.length > 0 && (
        <div className="bg-muted rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3">Debit spending by category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={debitData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="amount" radius={[4,4,0,0]}>
                {debitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'debit', 'credit'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-full text-xs transition-colors capitalize
              ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
            {t === 'all' ? 'All' : t === 'debit' ? 'Debits' : 'Credits'}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {filtered.map(e => (
          <div key={e.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              {e.type === 'credit'
                ? <TrendingUp size={16} className="text-green-500 shrink-0" />
                : <TrendingDown size={16} className="text-red-500 shrink-0" />}
              <div>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.category} · {e.date}</p>
                {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-semibold ${e.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                {e.type === 'credit' ? '+' : '-'}₹{Number(e.amount).toLocaleString()}
              </span>
              <button onClick={() => deleteExpense.mutate(e.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
        )}
      </div>
    </div>
  )
}
