# FlowViz - Attack Flow Visualizer

Open-source tool that analyzes cybersecurity articles and generates interactive attack flow visualizations using MITRE ATT&CK.

## Features

- Multi-provider AI support (Anthropic Claude, OpenAI GPT, Ollama)
- Real-time streaming visualization as content is analyzed
- MITRE ATT&CK technique mapping
- Export to PNG, STIX 2.1, Attack Flow Builder (.afb), or JSON
- Story mode for cinematic attack progression playback
- Save and load previous analyses

## Quick Start

**Prerequisites:** Node.js 18+

1. Clone and install:
   ```bash
   git clone https://github.com/davidljohnson/flowviz.git
   cd flowviz
   npm install
   ```

2. Configure provider:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add at least one:
   - `ANTHROPIC_API_KEY` - Get from [console.anthropic.com](https://console.anthropic.com)
   - `OPENAI_API_KEY` - Get from [platform.openai.com](https://platform.openai.com)
   - `OLLAMA_BASE_URL` + `OLLAMA_TEXT_MODEL` - For local models (no API key needed)
   - Or multiple to enable switching between providers

3. Start:
   ```bash
   npm run dev:full
   ```
   Opens at http://localhost:5173

## Usage

1. Paste a cybersecurity article URL or text
2. Click "Analyze Article"
3. Watch the attack flow build in real-time
4. Click nodes for details, use Story Mode for playback
5. Export or save your analysis

## Configuration

See `.env.example` for all options. Key settings:

```env
# Required (choose one or multiple)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=
OLLAMA_TEXT_MODEL=

# Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o
PORT=3001
```

## Ollama Configuration

1. Download Ollama from [ollama.com/download](https://ollama.com/download)
2. Pull a model: `ollama pull mistral:7b` (or any model you prefer)
3. Add to `.env`:
   ```env
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_TEXT_MODEL=mistral:7b
   ```

Available models are detected automatically from your local Ollama instance. The Ollama provider currently supports text analysis only (vision analysis is skipped).

For best results with a high-end GPU (e.g. NVIDIA RTX 5090), try `huggingface.co/TeichAI/Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF:latest` — a 14B parameter model that produces more detailed attack flows. Smaller models like `mistral:7b` work well for shorter articles.

## Troubleshooting

**API key not working:**
- Verify key in `.env` file
- Restart server: `npm run dev:full`
- Check account has credits

**CORS errors:**
- Ensure backend is running (`npm run server`)
- Check requests use `/api` proxy

## Development

```bash
npm run dev        # Frontend only
npm run server     # Backend only
npm run dev:full   # Both (recommended)
npm run build      # Production build
```

## Architecture

- **Frontend:** React 18 + TypeScript + Material-UI + React Flow
- **Backend:** Express proxy with rate limiting and SSRF protection
- **AI:** Anthropic Claude / OpenAI GPT / Ollama via server-side API calls

## License

MIT License - see LICENSE file for details
