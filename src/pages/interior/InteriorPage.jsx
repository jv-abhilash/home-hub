import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { analyzeRoomImage, generateRoomImage, IMAGE_GEN_BACKENDS } from '../../lib/imageGen'
import { Palette, Plus, Trash2, Upload, Sparkles, Image, Camera, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'

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

export default function InteriorPage() {
  const qc = useQueryClient()
  const { data: rooms = [], isLoading } = useQuery({ queryKey: ['rooms'], queryFn: fetchRooms })

  const [form, setForm] = useState({ name: '', style: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [budget, setBudget] = useState('')
  const [analysisBackend, setAnalysisBackend] = useState('ollama_llava')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const [genPrompt, setGenPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [generating, setGenerating] = useState(false)

  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0]
      if (!file) return
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setAnalysis('')
    },
    accept: { 'image/*': [] },
    maxFiles: 1
  })

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (err) {
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
    canvas.toBlob((blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      setImageFile(file)
      setImagePreview(URL.createObjectURL(blob))
      setAnalysis('')
      stopCamera()
      toast.success('Photo captured')
    }, 'image/jpeg', 0.9)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setAnalysis('')
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

  async function handleAnalyze() {
    if (!imageFile) return toast.error('Upload or capture a room photo first')
    if (!selectedRoom) return toast.error('Select a room first')
    setAnalyzing(true)
    try {
      const base64 = await toBase64(imageFile)
      const result = await analyzeRoomImage({
        base64Image: base64,
        roomName: selectedRoom.name,
        budget,
        backend: analysisBackend
      })
      setAnalysis(result)
    } catch (err) {
      toast.error('Analysis failed: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleGenerate() {
    if (!genPrompt) return toast.error('Describe what you want to generate')
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

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.name) return toast.error('Room name required')
    addRoom.mutate(form)
  }

  return (
    <div className="max-w-4xl mx-auto">
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
            placeholder="Room name (e.g. Living room)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Style preference (e.g. Minimalist)" value={form.style}
            onChange={e => setForm({ ...form, style: e.target.value })} />
          <input className="col-span-2 bg-background rounded-lg px-3 py-2 text-sm outline-none border border-border"
            placeholder="Notes" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="col-span-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm">
            Save room
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {rooms.map(r => (
          <div
            key={r.id}
            onClick={() => {
              setSelectedRoom(r)
              setAnalysis('')
              setImageFile(null)
              setImagePreview(null)
              setGeneratedImage(null)
            }}
            className={`relative rounded-xl p-4 cursor-pointer border transition-colors
              ${selectedRoom?.id === r.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted hover:border-primary/50'}`}
          >
            <p className="text-sm font-medium">{r.name}</p>
            {r.style && <p className="text-xs text-muted-foreground mt-1">{r.style}</p>}
            <button
              onClick={e => { e.stopPropagation(); deleteRoom.mutate(r.id) }}
              className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {!isLoading && rooms.length === 0 && (
          <p className="col-span-3 text-sm text-muted-foreground text-center py-4">No rooms yet. Add one above.</p>
        )}
      </div>

      {selectedRoom && (
        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-xl p-5">
            <p className="text-sm font-medium mb-1">Analyze — {selectedRoom.name}</p>
            <p className="text-xs text-muted-foreground mb-4">Upload or capture a photo and get AI suggestions</p>

            {/* Backend selector */}
            <div className="flex gap-2 mb-4">
              {Object.entries(IMAGE_GEN_BACKENDS).filter(([k]) => k !== 'comfyui').map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAnalysisBackend(key)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors
                    ${analysisBackend === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-border'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Camera view */}
            {showCamera && (
              <div className="mb-4 relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} className="w-full max-h-64 object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="bg-white text-black px-5 py-2 rounded-full text-sm font-medium"
                  >
                    Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-black/60 text-white px-4 py-2 rounded-full text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image preview */}
            {imagePreview && !showCamera && (
              <div className="relative mb-4">
                <img src={imagePreview} alt="Room" className="w-full max-h-64 rounded-xl object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Upload + Camera buttons */}
            {!imagePreview && !showCamera && (
              <div className="flex gap-3 mb-4">
                <div
                  {...getRootProps()}
                  className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload size={20} />
                    <p className="text-xs">Drop photo or click to upload</p>
                  </div>
                </div>

                {isCameraSupported() && (
                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border
                      rounded-xl px-6 text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    <Camera size={20} />
                    <p className="text-xs">Use camera</p>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <input
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
                placeholder="Budget in Rs. (optional)"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !imageFile}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                <Sparkles size={16} />
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {analysis && (
              <div className="bg-muted rounded-xl p-4 mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">AI analysis</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{analysis}</p>
              </div>
            )}
          </div>

          {/* Image generation */}
          <div className="border border-border rounded-xl p-5">
            <p className="text-sm font-medium mb-1">Generate room image</p>
            <p className="text-xs text-muted-foreground mb-4">
              Requires ComfyUI at localhost:7860 — ready for when you set up larger models
            </p>
            <div className="flex gap-3">
              <input
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
                placeholder="e.g. minimalist sofa with warm lighting"
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !genPrompt}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                <Image size={16} />
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {generatedImage
              ? <img src={generatedImage} alt="Generated" className="mt-4 rounded-xl w-full object-cover max-h-64" />
              : <div className="mt-4 bg-muted rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">Image generation endpoint ready — connect ComfyUI to activate</p>
                </div>
            }
          </div>
        </div>
      )}
    </div>
  )
}
