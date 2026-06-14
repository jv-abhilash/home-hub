const OLLAMA_BASE = import.meta.env.VITE_OLLAMA_URL || 'http://192.168.68.59:11434'
const COMFYUI_URL = 'http://localhost:7860'

export const IMAGE_GEN_BACKENDS = {
  comfyui: 'ComfyUI (Stable Diffusion)',
  ollama_llava: 'LLaVA via Ollama (analysis only)',
  claude: 'Claude API (vision + analysis)',
}

export async function analyzeRoomImage({ base64Image, roomName, budget, backend = 'ollama_llava' }) {
  if (backend === 'ollama_llava') {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        stream: false,
        messages: [{
          role: 'user',
          content: `This is my ${roomName}. Budget: Rs.${budget || 'flexible'}.
Analyze this room and give me:
1. Current style detected
2. Three specific improvement suggestions
3. Color palette recommendation with hex codes
4. Top 3 furniture or decor items to buy with Indian prices`,
          images: [base64Image]
        }]
      })
    })
    const data = await res.json()
    return data.message.content
  }

  if (backend === 'claude') {
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
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
            { type: 'text', text: `This is my ${roomName}. Budget: Rs.${budget || 'flexible'}.
Analyze this room and give me:
1. Current style detected
2. Three specific improvement suggestions
3. Color palette recommendation with hex codes
4. Top 3 furniture or decor items with Indian prices` }
          ]
        }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.content[0].text
  }

  throw new Error(`Unknown backend: ${backend}`)
}

export async function generateRoomImage({ prompt, style, roomName, backend = 'comfyui' }) {
  if (backend === 'comfyui') {
    const fullPrompt = `interior design, ${roomName}, ${style || 'modern'} style, ${prompt}, photorealistic, 4k, professional photography`
    const negativePrompt = 'ugly, blurry, low quality, distorted, watermark'
    const res = await fetch(`${COMFYUI_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        steps: 30,
        width: 768,
        height: 512,
        cfg_scale: 7,
        sampler_name: 'DPM++ 2M Karras',
      })
    })
    const data = await res.json()
    return `data:image/png;base64,${data.images[0]}`
  }

  throw new Error('Image generation requires ComfyUI running at localhost:7860')
}
