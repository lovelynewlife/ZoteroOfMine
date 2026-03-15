# Tech Stack Option B: Electron + LangGraph JS

## Overview

Full-featured desktop application using Electron with LangGraph JS running in Node.js main process.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Zotero Plugin | TypeScript + zotero-plugin-toolkit |
| Desktop App | Electron + React |
| Agent Framework | LangGraph JS |
| LLM Integration | LangChain JS |
| UI | Tailwind CSS + shadcn/ui |

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Zotero Plugin                 │
│         localhost:23119                 │
│                                         │
│  Data API:                              │
│  - GET /api/papers                      │
│  - GET /api/papers/search               │
│  - GET /api/papers/:id                  │
│  - GET /api/papers/:id/pdf              │
└─────────────────────────────────────────┘
                    ▲
                    │ HTTP
                    │
┌─────────────────────────────────────────┐
│        Electron Application             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Renderer Process (Chromium)   │   │
│  │                                 │   │
│  │   React UI                      │   │
│  └─────────────────────────────────┘   │
│                  ▲                      │
│                  │ IPC                  │
│                  ▼                      │
│  ┌─────────────────────────────────┐   │
│  │   Main Process (Node.js)        │   │
│  │                                 │   │
│  │   LangGraph Agent + Tools       │   │
│  │   - Window management           │   │
│  │   - File system                 │   │
│  │   - System tray                 │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    ▲
                    │ HTTPS
                    │
┌─────────────────────────────────────────┐
│           LLM Providers                 │
│  OpenAI / Claude / Ollama               │
└─────────────────────────────────────────┘
```

---

## Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Agent Runtime** | Runs in Main Process (Node.js) |
| **Package Size** | ~150MB per platform |
| **Node.js Required** | Yes - bundled with Electron |
| **Communication** | IPC between Renderer and Main |

---

## Pros & Cons

### Pros
- Rich ecosystem and tooling
- Large community and examples
- Full Node.js API in main process
- Better LangGraph JS support (Node runtime)
- Mature auto-update solutions

### Cons
- Large package size (~150MB)
- Higher memory usage
- More complex IPC architecture

---

## IPC Communication

```
Renderer Process (React)
        │
        │  window.electron.invoke('chat', message)
        ▼
Main Process (Node.js)
        │
        │  agent.invoke({ messages: [...] })
        ▼
    LLM / Zotero API
        │
        ▼
    Return result
```

---

## Distribution

```
vibe-research-win.exe         ~150MB
vibe-research-mac.dmg         ~180MB (Universal)
vibe-research-linux.AppImage  ~150MB
```

---

## Feature Enhancements

### Phase 1: Core Features

| Feature | Description |
|---------|-------------|
| **Paper Search** | Natural language search across Zotero library |
| **Paper Summary** | Summarize paper abstract, methodology, conclusions |
| **PDF Extraction** | Extract and analyze specific sections from PDFs |
| **Chat History** | Persist and browse conversation history |

### Phase 2: Advanced Features

| Feature | Description |
|---------|-------------|
| **Multi-Turn Context** | Maintain context across conversation turns |
| **Citation Analysis** | Analyze citation networks and related papers |
| **Note Integration** | Save agent responses as Zotero notes |
| **Batch Operations** | Process multiple papers simultaneously |

### Phase 3: Intelligence Features

| Feature | Description |
|---------|-------------|
| **Local LLM** | Support Ollama for offline usage |
| **RAG Enhancement** | Index PDFs for better retrieval accuracy |
| **Custom Tools** | Allow users to define custom agent tools |
| **Multi-Language** | Support Chinese and other languages |

### Future Ideas

| Feature | Description |
|---------|-------------|
| **Literature Review** | Auto-generate literature review drafts |
| **Paper Comparison** | Compare multiple papers side-by-side |
| **Research Trend** | Analyze research trends in a field |
| **Export Formats** | Export summaries to Markdown, LaTeX, etc. |
