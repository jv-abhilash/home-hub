# Home hub — startup guide

## Every time you restart your system, run these in order:

### 1. Ollama starts automatically on boot (no need to run manually)
To verify it is running:
ollama list

If for some reason it is stopped, restart it with:
sudo systemctl restart ollama

### 2. Start the app (new terminal)
cd ~/home-hub
npm run dev
App runs at http://localhost:5173

---

## Models installed (already on your system)

| Model       | Use                   | Size  |
|-------------|-----------------------|-------|
| llama3.2    | AI chat (all modules) | 2GB   |
| llava       | Room photo analysis   | 4.7GB |

## Future models to pull when needed

| Model         | Use                        | Command                    | Size  |
|---------------|----------------------------|----------------------------|-------|
| llava:13b     | Better room analysis       | ollama pull llava:13b      | 8GB   |
| llama3.1:70b  | Smarter chat               | ollama pull llama3.1:70b   | 40GB  |
| sdxl (future) | Image generation           | via ComfyUI or A1111       | 6GB+  |

---

## Environment variables (.env in project root)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_CLAUDE_API_KEY=your_key (only needed for interior Claude API fallback)

---

## Supabase tables (already created)
- expenses       — fund tracker
- tasks          — move-in planner
- guests         — guest list
- appliances     — maintenance log
- rooms          — interior design

---

## Project structure
home-hub/
  src/
    hooks/useLLM.js         AI chat context engine
    lib/supabase.js         database connection
    store/index.js          global state
    components/
      shared/
        Sidebar.jsx         navigation
        ChatPanel.jsx       AI chat UI
    pages/
      fund/                 expense tracker
      planner/              move-in checklist
      guests/               guest list
      maintenance/          appliance log
      interior/             room analyzer + image gen
  STARTUP.md                this file

---

## Future: pushing to tablet
- Build:        npm run build
- Output goes to dist/ folder
- Serve with:   npx serve dist
- Or deploy to Vercel and open on tablet browser

---

## Future: image generation endpoints
- Stubbed in InteriorPage.jsx under generateRoomImage()
- Will connect to ComfyUI or Automatic1111 at http://localhost:7860
- Models: SDXL, Realistic Vision, Interior Design LoRA
