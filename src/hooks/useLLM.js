import { useState } from 'react'
import { supabase } from '../lib/supabase'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

async function fetchContext(module) {
  try {
    if (module === 'fund') {
      const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
      if (!data || data.length === 0) return 'No expenses recorded yet.'
      const total = data.reduce((s, e) => s + Number(e.amount), 0)
      const thisMonth = new Date().toISOString().slice(0, 7)
      const monthData = data.filter(e => e.date?.startsWith(thisMonth))
      const monthTotal = monthData.reduce((s, e) => s + Number(e.amount), 0)
      const categories = [...new Set(data.map(e => e.category))]
      const catBreakdown = categories.map(cat => {
        const catTotal = data.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
        return `${cat}: Rs.${catTotal.toLocaleString()}`
      }).join(', ')
      return `EXPENSE DATA:
Total spent: Rs.${total.toLocaleString()}
This month (${thisMonth}): Rs.${monthTotal.toLocaleString()}
Total transactions: ${data.length}
Category breakdown: ${catBreakdown}
Recent 5: ${data.slice(0, 5).map(e => `${e.title} Rs.${e.amount} (${e.category}, ${e.date})`).join(' | ')}`
    }

    if (module === 'planner') {
      const { data } = await supabase.from('tasks').select('*')
      if (!data || data.length === 0) return 'No tasks recorded yet.'
      const done = data.filter(t => t.status === 'done')
      const pending = data.filter(t => t.status === 'pending')
      const high = pending.filter(t => t.priority === 'high')
      const rooms = [...new Set(data.map(t => t.room))]
      return `TASK DATA:
Total tasks: ${data.length}
Completed: ${done.length}
Pending: ${pending.length}
High priority pending: ${high.map(t => t.title).join(', ') || 'none'}
Rooms: ${rooms.join(', ')}
All pending tasks: ${pending.map(t => `${t.title} (${t.room}, ${t.priority})`).join(' | ')}`
    }

    if (module === 'guests') {
      const { data } = await supabase.from('guests').select('*')
      if (!data || data.length === 0) return 'No guests recorded yet.'
      const confirmed = data.filter(g => g.rsvp === 'confirmed')
      const pending = data.filter(g => g.rsvp === 'pending')
      const declined = data.filter(g => g.rsvp === 'declined')
      const dietary = data.filter(g => g.dietary)
      return `GUEST DATA:
Total invited: ${data.length}
Confirmed: ${confirmed.length} — ${confirmed.map(g => g.name).join(', ') || 'none'}
Pending: ${pending.length} — ${pending.map(g => g.name).join(', ') || 'none'}
Declined: ${declined.length} — ${declined.map(g => g.name).join(', ') || 'none'}
Dietary needs: ${dietary.map(g => `${g.name}: ${g.dietary}`).join(', ') || 'none'}`
    }

    if (module === 'maintenance') {
      const { data } = await supabase.from('appliances').select('*')
      if (!data || data.length === 0) return 'No appliances recorded yet.'
      const today = new Date()
      const overdue = data.filter(a => a.next_service && new Date(a.next_service) < today)
      const dueSoon = data.filter(a => {
        if (!a.next_service) return false
        const days = (new Date(a.next_service) - today) / (1000 * 60 * 60 * 24)
        return days >= 0 && days <= 30
      })
      return `APPLIANCE DATA:
Total: ${data.length}
All appliances: ${data.map(a => `${a.name} (${a.brand || 'no brand'}, warranty: ${a.warranty_until || 'unknown'}, next service: ${a.next_service || 'not set'})`).join(' | ')}
Overdue service: ${overdue.map(a => a.name).join(', ') || 'none'}
Due within 30 days: ${dueSoon.map(a => a.name).join(', ') || 'none'}`
    }

    if (module === 'interior') {
      const { data } = await supabase.from('rooms').select('*')
      if (!data || data.length === 0) return 'No rooms recorded yet.'
      return `ROOM DATA:
Total rooms: ${data.length}
Rooms: ${data.map(r => `${r.name} (style: ${r.style || 'not set'}, notes: ${r.notes || 'none'})`).join(' | ')}`
    }

    return ''
  } catch (err) {
    return 'Could not fetch data from database.'
  }
}

export function useLLM(module) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  async function send(userMessage) {
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const context = await fetchContext(module)
      const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })

      const systemPrompt = `You are a helpful home assistant for the ${module} module of a home management app.
Today is ${today}.
You have access to the user's live data below. Answer questions using this data accurately.
Use Rs. for currency. Be concise and friendly. If asked something outside your data, say so.

${context}`

      if (module === 'interior') {
        const res = await fetch(CLAUDE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-5',
            max_tokens: 1024,
            system: systemPrompt,
            messages: newMessages,
          }),
        })
        const data = await res.json()
        const reply = data.content[0].text
        setMessages([...newMessages, { role: 'assistant', content: reply }])
      } else {
        const res = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2',
            messages: [
              { role: 'system', content: systemPrompt },
              ...newMessages,
            ],
            stream: false,
          }),
        })
        const data = await res.json()
        const reply = data.message.content
        setMessages([...newMessages, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Could not reach the AI. Make sure Ollama is running: sudo systemctl restart ollama'
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearMessages() { setMessages([]) }

  return { messages, loading, send, clearMessages }
}
