import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const fetchFunds = async () => {
  const { data, error } = await supabase.from('home_funds').select('*').order('date', { ascending: false })
  if (error) throw error
  return data
}

const fetchDeal = async () => {
  const { data, error } = await supabase.from('home_deal').select('*').limit(1)
  if (error) throw error
  return data?.[0] || null
}

const SOURCES = ['Dad', 'Mom', 'Bank loan', 'My savings', 'Uncle', 'Friend', 'Other']
const RECIPIENTS = ['Owner', 'Registrar', 'Bank', 'Lawyer', 'Agent', 'Other']

export default function MainFundsPage() {
  const qc = useQueryClient()
  const { data: funds = [], isLoading } = useQuery({ queryKey: ['home_funds'], queryFn: fetchFunds })
  const { data: deal } = useQuery({ queryKey: ['home_deal'], queryFn: fetchDeal })

  const [showForm, setShowForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [formType, setFormType] = useState('credit')
  const [filterView, setFilterView] = useState('all')

  const [form, setForm] = useState({
    type: 'credit',
    direction: 'confirmed',
    source_recipient: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  })

  const [dealForm, setDealForm] = useState({
    agreed_price: '',
    property_name: '',
    owner_name: '',
    notes: ''
  })

  const addFund = useMutation({
    mutationFn: async (item) => {
      const { error } = await supabase.from('home_funds').insert(item)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['home_funds'])
      setForm({ type: formType, direction: 'confirmed', source_recipient: '', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' })
      setShowForm(false)
      toast.success('Added successfully')
    },
    onError: () => toast.error('Failed to add')
  })

  const deleteFund = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('home_funds').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['home_funds'])
      toast.success('Deleted')
    }
  })

  const saveDeal = useMutation({
    mutationFn: async (item) => {
      if (deal) {
        const { error } = await supabase.from('home_deal').update(item).eq('id', deal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('home_deal').insert(item)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['home_deal'])
      setShowDealForm(false)
      toast.success('Deal details saved')
    },
    onError: () => toast.error('Failed to save deal')
  })

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.source_recipient || !form.amount) return toast.error('Source/recipient and amount required')
    if (form.direction === 'confirmed' && !form.date) return toast.error('Date required for confirmed transactions')
    addFund.mutate({ ...form, amount: Number(form.amount), type: formType })
  }

  function handleDealSubmit(ev) {
    ev.preventDefault()
    if (!dealForm.agreed_price) return toast.error('Agreed price required')
    saveDeal.mutate({ ...dealForm, agreed_price: Number(dealForm.agreed_price) })
  }

  function openForm(type) {
    setFormType(type)
    setForm({ type, direction: 'confirmed', source_recipient: '', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' })
    setShowForm(true)
  }

  // Calculations — only confirmed transactions affect balance
  const confirmedCredits = funds.filter(f => f.type === 'credit' && f.direction === 'confirmed')
  const confirmedDebits = funds.filter(f => f.type === 'debit' && f.direction === 'confirmed')
  const expectedCredits = funds.filter(f => f.type === 'credit' && f.direction === 'expected')
  const expectedDebits = funds.filter(f => f.type === 'debit' && f.direction === 'expected')

  const totalReceived = confirmedCredits.reduce((s, f) => s + Number(f.amount), 0)
  const totalPaid = confirmedDebits.reduce((s, f) => s + Number(f.amount), 0)
  const balance = totalReceived - totalPaid
  const totalExpectedIn = expectedCredits.reduce((s, f) => s + Number(f.amount), 0)
  const totalExpectedOut = expectedDebits.reduce((s, f) => s + Number(f.amount), 0)

  // Owner deal calculations
  const ownerPaid = confirmedDebits
    .filter(f => f.source_recipient?.toLowerCase() === deal?.owner_name?.toLowerCase() || f.source_recipient === 'Owner')
    .reduce((s, f) => s + Number(f.amount), 0)
  const ownerRemaining = deal ? Number(deal.agreed_price) - ownerPaid : 0
  const ownerExpected = expectedDebits
    .filter(f => f.source_recipient?.toLowerCase() === deal?.owner_name?.toLowerCase() || f.source_recipient === 'Owner')
    .reduce((s, f) => s + Number(f.amount), 0)

  // Filter list
  const filtered = funds.filter(f => {
    if (filterView === 'all') return true
    if (filterView === 'confirmed_in') return f.type === 'credit' && f.direction === 'confirmed'
    if (filterView === 'confirmed_out') return f.type === 'debit' && f.direction === 'confirmed'
    if (filterView === 'expected_in') return f.type === 'credit' && f.direction === 'expected'
    if (filterView === 'expected_out') return f.type === 'debit' && f.direction === 'expected'
    return true
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet size={24} />
          <h1 className="text-2xl font-semibold">Main funds</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowDealForm(!showDealForm); setDealForm({ agreed_price: deal?.agreed_price || '', property_name: deal?.property_name || '', owner_name: deal?.owner_name || '', notes: deal?.notes || '' }) }}
            className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings size={14} /> Deal setup
          </button>
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

      {/* Deal setup form */}
      {showDealForm && (
        <form onSubmit={handleDealSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 border-2 border-primary/30">
          <div className="col-span-2">
            <p className="text-sm font-medium mb-1">Home deal details</p>
            <p className="text-xs text-muted-foreground">Set the agreed price with owner to track payment progress</p>
          </div>
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Property name (e.g. 3BHK Whitefield)" value={dealForm.property_name}
            onChange={e => setDealForm({ ...dealForm, property_name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Owner name" value={dealForm.owner_name}
            onChange={e => setDealForm({ ...dealForm, owner_name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Agreed price (₹)" type="number" value={dealForm.agreed_price}
            onChange={e => setDealForm({ ...dealForm, agreed_price: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes" value={dealForm.notes}
            onChange={e => setDealForm({ ...dealForm, notes: e.target.value })} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save deal details
          </button>
        </form>
      )}

      {/* Owner deal progress */}
      {deal && (
        <div className="bg-muted rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">{deal.property_name || 'Home purchase'} — {deal.owner_name || 'Owner'}</p>
              <p className="text-xs text-muted-foreground">Agreed price: ₹{Number(deal.agreed_price).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Remaining to pay</p>
              <p className="text-lg font-semibold text-red-500">₹{ownerRemaining.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full bg-background rounded-full h-2 mb-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min((ownerPaid / Number(deal.agreed_price)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Paid: ₹{ownerPaid.toLocaleString()}</span>
            <span>{Math.round((ownerPaid / Number(deal.agreed_price)) * 100)}% complete</span>
          </div>
          {ownerExpected > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 mt-2">
              <AlertCircle size={12} />
              Expected upcoming payments to owner: ₹{ownerExpected.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl p-4 ${balance >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <p className="text-xs text-muted-foreground mb-1">Current balance</p>
          <p className={`text-2xl font-semibold ${balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            ₹{Math.abs(balance).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{balance >= 0 ? 'available' : 'deficit'}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-green-600 mb-1">Total received</p>
          <p className="text-2xl font-semibold text-green-600">₹{totalReceived.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{confirmedCredits.length} sources</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-red-500 mb-1">Total paid out</p>
          <p className="text-2xl font-semibold text-red-500">₹{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{confirmedDebits.length} payments</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-semibold">{funds.length}</p>
          <p className="text-xs text-muted-foreground">{expectedCredits.length + expectedDebits.length} pending</p>
        </div>
      </div>

      {/* Expected summary */}
      {(totalExpectedIn > 0 || totalExpectedOut > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {totalExpectedIn > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-amber-600" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Expected to receive</p>
              </div>
              <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">₹{totalExpectedIn.toLocaleString()}</p>
              <p className="text-xs text-amber-600">{expectedCredits.length} pending — not in balance</p>
            </div>
          )}
          {totalExpectedOut > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Expected to pay</p>
              </div>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">₹{totalExpectedOut.toLocaleString()}</p>
              <p className="text-xs text-red-500">{expectedDebits.length} pending — not in balance</p>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 border-2
          ${formType === 'credit' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-primary/30 bg-muted'}`}>
          <div className="col-span-2 flex items-center gap-2 mb-1">
            {formType === 'credit'
              ? <TrendingUp size={16} className="text-green-600" />
              : <TrendingDown size={16} className="text-primary" />}
            <span className="text-sm font-medium">
              {formType === 'credit' ? 'Add credit (money coming in)' : 'Add debit (money going out)'}
            </span>
          </div>

          {/* Confirmed vs Expected toggle */}
          <div className="col-span-2 flex gap-2">
            {['confirmed', 'expected'].map(d => (
              <button key={d} type="button"
                onClick={() => setForm({ ...form, direction: d })}
                className={`px-4 py-1.5 rounded-full text-xs transition-colors capitalize
                  ${form.direction === d ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground'}`}>
                {d === 'confirmed'
                  ? formType === 'credit' ? 'Already received' : 'Already paid'
                  : formType === 'credit' ? 'Expecting to receive' : 'Yet to pay'}
              </button>
            ))}
          </div>

          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder={formType === 'credit' ? 'Source (e.g. Dad, Bank loan)' : 'Recipient (e.g. Owner, Registrar)'}
            value={form.source_recipient}
            onChange={e => setForm({ ...form, source_recipient: e.target.value })}
            list={formType === 'credit' ? 'sources' : 'recipients'}
          />
          <datalist id="sources">{SOURCES.map(s => <option key={s} value={s} />)}</datalist>
          <datalist id="recipients">{RECIPIENTS.map(r => <option key={r} value={r} />)}</datalist>

          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Amount (₹)" type="number" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })} />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              {form.direction === 'confirmed' ? 'Transaction date' : 'Expected by date (optional)'}
            </label>
            <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
              type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>

          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes (optional)" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />

          <button type="submit"
            className={`col-span-2 rounded-lg py-2 text-sm text-white
              ${formType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-primary'}`}>
            Save {form.direction === 'confirmed' ? 'transaction' : 'expected payment'}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          ['all', 'All'],
          ['confirmed_in', 'Received'],
          ['confirmed_out', 'Paid out'],
          ['expected_in', 'Expecting in'],
          ['expected_out', 'Yet to pay'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilterView(val)}
            className={`px-3 py-1 rounded-full text-xs transition-colors
              ${filterView === val ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        <AnimatePresence>
          {filtered.map(f => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border
                ${f.direction === 'expected'
                  ? 'border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-border bg-muted'}`}
            >
              <div className="flex items-center gap-3">
                {f.direction === 'confirmed'
                  ? f.type === 'credit'
                    ? <TrendingUp size={16} className="text-green-500 shrink-0" />
                    : <TrendingDown size={16} className="text-red-500 shrink-0" />
                  : <AlertCircle size={16} className="text-amber-500 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.source_recipient}</p>
                    {f.direction === 'expected' && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        {f.type === 'credit' ? 'expecting' : 'yet to pay'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.date
                      ? f.direction === 'confirmed' ? f.date : `Expected by: ${f.date}`
                      : f.direction === 'expected' ? 'No date set' : ''}
                    {f.notes && ` · ${f.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-semibold
                  ${f.direction === 'expected' ? 'text-amber-600 dark:text-amber-400' :
                    f.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                  {f.type === 'credit' ? '+' : '-'}₹{Number(f.amount).toLocaleString()}
                </span>
                <button onClick={() => deleteFund.mutate(f.id)}
                  className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions yet. Add your first one.
          </p>
        )}
      </div>
    </div>
  )
}
