# FlowViz - Attack Flow Visualizer

Open-source tool that analyzes cybersecurity articles and generates interactive attack flow visualizations using MITRE ATT&CK.

## Features

- Multi-provider AI support (Anthropic Claude, OpenAI GPT)
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

2. Configure API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add either:
   - `ANTHROPIC_API_KEY` - Get from [console.anthropic.com](https://console.anthropic.com)
   - `OPENAI_API_KEY` - Get from [platform.openai.com](https://platform.openai.com)
   - Or both to enable switching between providers

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
# Required (choose one or both)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4o
PORT=3001
```

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
