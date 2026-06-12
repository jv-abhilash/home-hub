const TAVILY_URL = 'https://api.tavily.com/search'

async function searchPrice(material) {
  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: import.meta.env.VITE_TAVILY_API_KEY,
      query: `${material} price per unit India 2026 cost`,
      search_depth: 'basic',
      max_results: 3,
      include_answer: true
    })
  })
  const data = await res.json()
  const snippets = data.results
    ?.slice(0, 3)
    .map(r => r.content?.slice(0, 200))
    .filter(Boolean)
    .join(' | ')
  return {
    material,
    answer: data.answer || '',
    snippets: snippets || ''
  }
}

async function identifyMaterials({ base64Image, roomName, backend }) {
  const prompt = `Look at this ${roomName} image carefully. 
List ONLY the materials and work items needed to renovate or improve this room.
Reply in this exact JSON format with no extra text:
{
  "materials": [
    {"name": "material name", "unit": "sqft/litre/piece/etc", "estimated_quantity": number},
    ...
  ],
  "room_size_sqft": estimated number
}
Keep it to maximum 8 most important items.`

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
            { type: 'text', text: prompt }
          ]
        }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.content[0].text
    const json = text.match(/\{[\s\S]*\}/)
    return JSON.parse(json[0])
  } else {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        stream: false,
        messages: [{
          role: 'user',
          content: prompt,
          images: [base64Image]
        }]
      })
    })
    const data = await res.json()
    const text = data.message.content
    const json = text.match(/\{[\s\S]*\}/)
    return JSON.parse(json[0])
  }
}

async function calculateEstimate({ materialsData, priceResults }) {
  const priceContext = priceResults.map(p =>
    `${p.material}: ${p.answer} | Additional info: ${p.snippets}`
  ).join('\n')

  const materialsContext = materialsData.materials.map(m =>
    `${m.name}: ${m.estimated_quantity} ${m.unit}`
  ).join('\n')

  const prompt = `You are a construction cost estimator in India.

MATERIALS NEEDED:
${materialsContext}
Room size: ${materialsData.room_size_sqft} sqft

CURRENT MARKET PRICES (from web search):
${priceContext}

Based on the above real market prices, calculate:
1. Cost for each material (quantity × price)
2. Add 10% labor cost on top of materials
3. Give a 10% confidence interval for each item (±10%)
4. Total estimate with confidence interval

Reply in this exact JSON format only, no extra text:
{
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "unit": "unit",
      "unit_price": number,
      "total": number,
      "min": number,
      "max": number,
      "source": "brief price source mention"
    }
  ],
  "labor_cost": number,
  "subtotal": number,
  "total_min": number,
  "total_max": number,
  "total": number
}`

  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await res.json()
  const text = data.message.content
  const json = text.match(/\{[\s\S]*\}/)
  return JSON.parse(json[0])
}

export async function runCostEstimation({ base64Image, roomName, backend, onProgress }) {
  try {
    onProgress('Analyzing room image...')
    const materialsData = await identifyMaterials({ base64Image, roomName, backend })

    onProgress(`Found ${materialsData.materials.length} materials. Searching current prices...`)

    const priceResults = []
    for (const mat of materialsData.materials) {
      onProgress(`Searching price for ${mat.name}...`)
      const result = await searchPrice(`${mat.name} ${mat.unit}`)
      priceResults.push(result)
      await new Promise(r => setTimeout(r, 300))
    }

    onProgress('Calculating estimate with confidence intervals...')
    const estimate = await calculateEstimate({ materialsData, priceResults })

    return { success: true, estimate, materialsData }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
