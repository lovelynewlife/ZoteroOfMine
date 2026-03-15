# Tech Stack Option A: Tauri + LangGraph JS

## Overview

Lightweight desktop application using Tauri with LangGraph JS running in WebView.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Zotero Plugin | TypeScript + zotero-plugin-toolkit |
| Desktop App | Tauri 2.x + React |
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
│         Tauri Application               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     WebView (Browser)           │   │
│  │                                 │   │
│  │  React UI + LangGraph Agent     │   │
│  │  (All runs in WebView)          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Rust Backend (Minimal)      │   │
│  │                                 │   │
│  │  - Window management            │   │
│  │  - File system                  │   │
│  │  - System tray                  │   │
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
| **Agent Runtime** | Runs in WebView (browser environment) |
| **Package Size** | ~15MB per platform |
| **Rust Required** | Minimal - only for native bindings |
| **Communication** | Direct JavaScript calls |

---

## Pros & Cons

### Pros
- Small package size (~15MB)
- Native performance
- Better security (WebView sandbox)
- No Node.js required in distribution

### Cons
- Smaller ecosystem
- Fewer examples and community resources
- Rust learning curve for advanced features
- LangGraph JS in browser has some limitations

---

## Data Flow

```
User Input
    │
    ▼
React UI (WebView)
    │
    ▼
LangGraph Agent (WebView)
    │
    ├─► LLM API (HTTPS)
    │
    └─► Zotero API (HTTP localhost:23119)
```

---

## Distribution

```
vibe-research-win.exe         ~15MB
vibe-research-mac.dmg         ~15MB
vibe-research-linux.AppImage  ~15MB
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
