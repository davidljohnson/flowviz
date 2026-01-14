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

2. Configure API key (note: if using Ollama,  API key is not needed):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add either:
   - `ANTHROPIC_API_KEY` - Get from [console.anthropic.com](https://console.anthropic.com)
   - `OPENAI_API_KEY` - Get from [platform.openai.com](https://platform.openai.com)
   - `OLLAMA_BASE_URL` - If hosting ollama locally, default IP and port is http://127.0.0.1:11434
   - Or all to enable switching between providers

   If using Ollama, specify `DEFAULT_AI_PROVIDER = ollama` in .env

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
Pre-requisite: download Ollama from [ollama.com/download] (https://ollama.com/download)
Default model is `huggingface.co/TeichAI/Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF:latest`.
In a terminal, run `ollama pull huggingface.co/TeichAI/Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF:latest` to download the model.

For better results, run the following to increase the default context size of the model:
- Create a file named "Modelfile"
- Contents of the file:
   ```
   FROM huggingface.co/Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF:latest
   PARAMETER num_ctx 32768
   ```

- After creating the file, run:
   ```
   ollama create Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF-32768-context -f ./Modelfile
   ```
- In a terminal, run `curl http://<YOUR_OLLAMA_ENDPOINT_IP>:11434/api/tags` to check if the model was created. If yes, one of model names should be `Qwen3-14B-Claude-Sonnet-4.5-Reasoning-Distill-GGUF-32768-context:latest`. Update .env to use this model.

Feel free to experiment with other models. The current Ollama configuration only supports text analysis and skips vision analysis. Works best for short intel reports.

Note: Tested with NVIDIA GeForce RTX 5090.

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
- **AI:** Anthropic Claude / OpenAI GPT via server-side API calls

## License

MIT License - see LICENSE file for details
