import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { generateRoomImage } from '../../lib/imageGen'
import CostEstimate from '../../components/interior/CostEstimate'
import { Palette, Plus, Trash2, Upload, Send, Camera, X, Image, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'

const fetchRooms = async () => {
  const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

async function sendToLLM({ messages, base64Image, roomName, budget, backend }) {
  if (backend === 'ollama_llava') {
    const ollamaMessages = messages.map((m, i) => {
      if (i === 0 && base64Image) {
        return { role: m.role, content: m.content, images: [base64Image] }
      }
      return { role: m.role, content: m.content }
    })
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llava', stream: false, messages: ollamaMessages })
    })
    const data = await res.json()
    return data.message.content
  }

  if (backend === 'claude') {
    const claudeMessages = messages.map((m, i) => {
      if (i === 0 && base64Image) {
        return {
          role: m.role,
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: m.content }
          ]
        }
      }
      return { role: m.role, content: m.content }
    })
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: `You are an expert interior design assistant. The user has shared a photo of their ${roomName}. Budget: Rs.${budget || 'flexible'}. Analyze the room and help them improve it. Remember all previous suggestions and build on them.`,
        messages: claudeMessages
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.content[0].text
  }
}

export default function InteriorPage() {
  const qc = useQueryClient()
  const { data: rooms = [], isLoading } = useQuery({ queryKey: ['rooms'], queryFn: fetchRooms })

  const [form, setForm] = useState({ name: '', style: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [base64Image, setBase64Image] = useState(null)
  const [budget, setBudget] = useState('')
  const [backend, setBackend] = useState('ollama_llava')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)

  const [genPrompt, setGenPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [generating, setGenerating] = useState(false)

  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const chatEndRef = useRef(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      const file = files[0]
      if (!file) return
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      const b64 = await toBase64(file)
      setBase64Image(b64)
      setMessages([])
      setChatStarted(false)
    },
    accept: { 'image/*': [] },
    maxFiles: 1
  })

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      toast.error('Camera not available — please upload a file instead')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      setImageFile(file)
      setImagePreview(URL.createObjectURL(blob))
      const b64 = await toBase64(file)
      setBase64Image(b64)
      setMessages([])
      setChatStarted(false)
      stopCamera()
      toast.success('Photo captured')
    }, 'image/jpeg', 0.9)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setBase64Image(null)
    setMessages([])
    setChatStarted(false)
  }

  async function handleSend(overrideText) {
    const text = overrideText || input
    if (!text.trim()) return
    if (!selectedRoom) return toast.error('Select a room first')
    if (!base64Image && !chatStarted) return toast.error('Upload a room photo first')

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setChatStarted(true)

    try {
      const reply = await sendToLLM({
        messages: newMessages,
        base64Image: chatStarted ? null : base64Image,
        roomName: selectedRoom.name,
        budget,
        backend
      })
      const updated = [...newMessages, { role: 'assistant', content: reply }]
      setMessages(updated)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function startAnalysis() {
    if (!base64Image) return toast.error('Upload a room photo first')
    if (!selectedRoom) return toast.error('Select a room first')
    const prompt = `Please analyze this ${selectedRoom.name}${budget ? ` with a budget of Rs.${budget}` : ''}. Tell me: 1) Current style 2) Three improvement suggestions 3) Color palette with hex codes 4) Top 3 furniture items with Indian prices`
    handleSend(prompt)
  }

  function resetChat() {
    setMessages([])
    setChatStarted(false)
    toast.success('Conversation reset')
  }

  async function handleGenerate() {
    if (!genPrompt) return toast.error('Describe the room you want')
    if (!selectedRoom) return toast.error('Select a room first')
    setGenerating(true)
    try {
      const result = await generateRoomImage({
        prompt: genPrompt,
        style: selectedRoom.style,
        roomName: selectedRoom.name,
        backend: 'comfyui'
      })
      setGeneratedImage(result)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const addRoom = useMutation({
    mutationFn: async (room) => {
      const { error } = await supabase.from('rooms').insert(room)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['rooms'])
      setForm({ name: '', style: '', notes: '' })
      setShowForm(false)
      toast.success('Room added')
    },
    onError: () => toast.error('Failed to add room')
  })

  const deleteRoom = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['rooms'])
      setSelectedRoom(null)
      toast.success('Deleted')
    }
  })

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.name) return toast.error('Room name required')
    addRoom.mutate(form)
  }

  const quickPrompts = [
    'Make it more minimalist',
    'Suggest warm lighting options',
    'What furniture should I replace first?',
    'Give me a color scheme',
    'How to make it look bigger?',
    'Budget-friendly changes under Rs.10000',
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Palette size={24} />
          <h1 className="text-2xl font-semibold">Interior design</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> Add room
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Room name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Style preference" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} />
          <input className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save room
          </button>
        </form>
      )}

      {/* Room cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {rooms.map(r => (
          <motion.div
            key={r.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setSelectedRoom(r)
              setMessages([])
              setChatStarted(false)
              setImageFile(null)
              setImagePreview(null)
              setBase64Image(null)
              setGeneratedImage(null)
            }}
            className={`relative rounded-xl p-4 cursor-pointer border transition-colors
              ${selectedRoom?.id === r.id ? 'border-primary bg-primary/5' : 'border-border bg-muted hover:border-primary/50'}`}
          >
            <p className="text-sm font-medium">{r.name}</p>
            {r.style && <p className="text-xs text-muted-foreground mt-1">{r.style}</p>}
            <button
              onClick={e => { e.stopPropagation(); deleteRoom.mutate(r.id) }}
              className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
        {!isLoading && rooms.length === 0 && (
          <p className="col-span-3 text-sm text-muted-foreground text-center py-4">No rooms yet. Add one above.</p>
        )}
      </div>

      {selectedRoom && (
        <div className="grid grid-cols-5 gap-4">

          {/* Left panel */}
          <div className="col-span-2 flex flex-col gap-3">

            {/* Photo upload */}
            <div className="border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Room photo</p>

              <div className="flex gap-2 mb-3 flex-wrap">
                {[['ollama_llava', 'LLaVA (local)'], ['claude', 'Claude API']].map(([key, label]) => (
                  <button key={key} onClick={() => setBackend(key)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors
                      ${backend === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {showCamera && (
                <div className="mb-3 relative rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                    <button onClick={capturePhoto} className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-medium">Capture</button>
                    <button onClick={stopCamera} className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs">Cancel</button>
                  </div>
                </div>
              )}

              {imagePreview && !showCamera && (
                <div className="relative mb-3">
                  <img src={imagePreview} alt="Room" className="w-full rounded-xl object-cover max-h-48" />
                  <button onClick={clearImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                    <X size={12} />
                  </button>
                  {chatStarted && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      Photo in context
                    </div>
                  )}
                </div>
              )}

              {!imagePreview && !showCamera && (
                <div className="flex gap-2 mb-3">
                  <div {...getRootProps()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <input {...getInputProps()} />
                    <Upload size={18} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload photo</p>
                  </div>
                  {isCameraSupported() && (
                    <button onClick={startCamera}
                      className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-xl px-4 text-muted-foreground hover:border-primary/50 transition-colors">
                      <Camera size={18} />
                      <p className="text-xs">Camera</p>
                    </button>
                  )}
                </div>
              )}

              <input
                className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border mb-3"
                placeholder="Budget in Rs. (optional)"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={startAnalysis}
                disabled={loading || !base64Image}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm disabled:opacity-50"
              >
                {chatStarted ? 'Re-analyze photo' : 'Analyze room'}
              </motion.button>
            </div>

            {/* Cost estimator */}
            <CostEstimate
              base64Image={base64Image}
              roomName={selectedRoom.name}
              backend={backend}
            />

            {/* Image generation */}
            <div className="border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-1">Generate room image</p>
              <p className="text-xs text-muted-foreground mb-3">Coming soon — needs ComfyUI</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs outline-none border border-border"
                  placeholder="Describe the room..."
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                />
                <button onClick={handleGenerate} disabled={generating || !genPrompt}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-lg disabled:opacity-50">
                  <Image size={14} />
                </button>
              </div>
              {generatedImage
                ? <img src={generatedImage} alt="Generated" className="mt-3 rounded-xl w-full object-cover" />
                : <p className="text-xs text-muted-foreground text-center mt-3">Endpoint ready — connect ComfyUI to activate</p>
              }
            </div>
          </div>

          {/* Right: chat */}
          <div className="col-span-3 border border-border rounded-xl flex flex-col" style={{ height: '600px' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Design chat — {selectedRoom.name}</p>
                <p className="text-xs text-muted-foreground">
                  {chatStarted ? `${messages.length} messages · photo in context` : 'Upload a photo and click Analyze to start'}
                </p>
              </div>
              {messages.length > 0 && (
                <button onClick={resetChat} className="text-muted-foreground hover:text-foreground">
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Palette size={32} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload a room photo and click Analyze room to start</p>
                  <p className="text-xs text-muted-foreground">Then keep chatting to refine your design</p>
                </div>
              )}

              <AnimatePresence>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`text-sm px-3 py-2 rounded-xl max-w-[90%] leading-relaxed
                      ${m.role === 'user'
                        ? 'bg-primary text-primary-foreground self-end'
                        : 'bg-muted self-start'}`}
                  >
                    {m.content}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-muted self-start px-3 py-2 rounded-xl text-sm text-muted-foreground"
                >
                  Thinking...
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatStarted && messages.length > 0 && (
              <div className="px-3 py-2 border-t border-border flex gap-2 overflow-x-auto">
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => handleSend(p)}
                    className="shrink-0 text-xs bg-muted hover:bg-border px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-border flex gap-2">
              <input
                className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none border border-border"
                placeholder={chatStarted ? 'Ask follow-up questions...' : 'Analyze the room first...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
                disabled={!chatStarted && messages.length === 0}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
