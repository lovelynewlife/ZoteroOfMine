# Vibe Research - Technical Stack Documentation

## Overview

Vibe Research is an AI-powered research assistant module for the ZoteroOfMine Zotero 7 plugin. It enables natural language interaction with your Zotero library, allowing users to search papers, analyze content, and get intelligent summaries.

---

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Zotero Plugin** | TypeScript + zotero-plugin-toolkit | Data layer, HTTP API server |
| **Desktop App** | Tauri 2.x + React | User interface, Agent runtime |
| **Agent Framework** | LangGraph JS | State management, tool orchestration |
| **LLM Integration** | LangChain JS | OpenAI/Claude API integration |
| **UI Components** | Tailwind CSS + shadcn/ui | Modern, responsive interface |

### Why This Stack

- **Tauri over Electron**: ~15MB vs ~200MB, native performance, better security
- **LangGraph JS over Python**: Full TypeScript stack, no Python bundling complexity, runs in browser
- **No Rust Required**: LangGraph runs in WebView, Rust only handles native bindings

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Zotero Plugin                            │
│                      localhost:23119                            │
│                                                                 │
│  Data API Endpoints:                                            │
│  ├── GET /api/papers              List all papers              │
│  ├── GET /api/papers/search       Search papers by query       │
│  ├── GET /api/papers/:id          Get paper details            │
│  ├── GET /api/papers/:id/pdf      Extract PDF text content     │
│  ├── GET /api/collections         List collections             │
│  └── GET /health                  Health check                 │
│                                                                 │
│  Runs inside Zotero process                                      │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP (fetch)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri Application                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   WebView (Frontend)                       │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              React Application                       │ │ │
│  │  │                                                      │ │ │
│  │  │  Components:                                         │ │ │
│  │  │  ├── ChatWindow      Main chat interface            │ │ │
│  │  │  ├── MessageList     Conversation history           │ │ │
│  │  │  ├── MessageInput    User input area                │ │ │
│  │  │  ├── PaperCard       Paper display card             │ │ │
│  │  │  └── SettingsPanel   API key, preferences           │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │            LangGraph Agent (Browser Runtime)         │ │ │
│  │  │                                                      │ │ │
│  │  │  ┌─────────────────────────────────────────────┐    │ │ │
│  │  │  │            Agent Graph                       │    │ │ │
│  │  │  │                                              │    │ │ │
│  │  │  │     ┌──────────┐                            │    │ │ │
│  │  │  │     │  Agent   │ ◄── LLM Decision           │    │ │ │
│  │  │  │     │  Node    │                            │    │ │ │
│  │  │  │     └────┬─────┘                            │    │ │ │
│  │  │  │          │                                  │    │ │ │
│  │  │  │          ▼                                  │    │ │ │
│  │  │  │     Need Tools?                             │    │ │ │
│  │  │  │      │    │                                 │    │ │ │
│  │  │  │     Yes   No                                │    │ │ │
│  │  │  │      │    │                                 │    │ │ │
│  │  │  │      ▼    ▼                                 │    │ │ │
│  │  │  │  ┌──────┐ END                              │    │ │ │
│  │  │  │  │Tools │                                  │    │ │ │
│  │  │  │  │Node  │                                  │    │ │ │
│  │  │  │  └──┬───┘                                  │    │ │ │
│  │  │  │     │                                      │    │ │ │
│  │  │  │     └──────────► Agent Node                │    │ │ │
│  │  │  └─────────────────────────────────────────────┘    │ │ │
│  │  │                                                      │ │ │
│  │  │  Tools:                                              │ │ │
│  │  │  ├── zotero_search     Search Zotero library        │ │ │
│  │  │  ├── zotero_get_paper  Get paper details            │ │ │
│  │  │  └── zotero_get_pdf    Extract PDF content          │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Rust Backend (Tauri Built-in)               │ │
│  │                                                           │ │
│  │  - Window management (create, show, hide, close)         │ │
│  │  - File system access (settings, cache)                  │ │
│  │  - System tray integration                               │ │
│  │  - Native dialogs                                        │ │
│  │                                                           │ │
│  │  Minimal custom code required                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Providers                              │
│                                                                 │
│  ├── OpenAI (GPT-4o, GPT-4o-mini)                              │
│  ├── Anthropic (Claude 3.5 Sonnet)                             │
│  └── OpenAI-Compatible APIs (Ollama, vLLM, etc.)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. User Query Flow

```
User Input: "Find papers about machine learning published after 2020"
         │
         ▼
┌─────────────────┐
│   Chat UI       │  User types message in input
│  (React)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LangGraph      │  Agent receives message as HumanMessage
│  Agent          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   LLM (GPT-4)   │  Analyzes intent, decides to use tool
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tool Call:      │  zotero_search(query="machine learning", 
│ zotero_search   │               year=">2020")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Zotero Plugin   │  HTTP GET /api/papers/search?q=...
│ Data API        │  Returns paper list
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LangGraph      │  Tool result fed back to agent
│  Agent          │  Agent generates response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Chat UI       │  Displays response with paper cards
│  (React)        │
└─────────────────┘
```

### 2. Multi-Turn Conversation

```
Turn 1: "Find papers about transformer architecture"
        └── Agent calls zotero_search
        └── Returns list of 10 papers
        └── Agent: "I found 10 papers. Here are the top results..."

Turn 2: "Show me the third one"
        └── Agent understands context (third paper from previous results)
        └── Agent calls zotero_get_paper(id=...)
        └── Returns detailed paper info
        └── Agent: "Here's the paper 'Attention Is All You Need'..."

Turn 3: "Summarize the methodology section"
        └── Agent calls zotero_get_pdf(id=..., pages="methodology")
        └── Returns extracted text from PDF
        └── Agent generates summary
        └── Agent: "The methodology section describes..."
```

---

## Component Responsibilities

### Zotero Plugin (Data Layer)

| File | Responsibility |
|------|---------------|
| `src/modules/vibeServer.ts` | HTTP server setup, route definitions |
| `src/modules/vibeResearch.ts` | Lifecycle management, server start/stop |
| `src/utils/zdb.ts` | Zotero database queries |

**Key Functions:**
- Expose Zotero data via REST API
- Handle PDF text extraction
- Manage server lifecycle (start when plugin loads, stop when unloads)

### Tauri App (Presentation + Logic Layer)

| Directory | Responsibility |
|-----------|---------------|
| `src/components/` | React UI components |
| `src/agent/` | LangGraph agent definition |
| `src/agent/tools/` | Tool implementations |
| `src/lib/` | Utilities (API clients, helpers) |
| `src-tauri/` | Tauri configuration (minimal changes) |

**Key Functions:**
- Render chat interface
- Run LangGraph agent in browser context
- Handle LLM API calls
- Manage user settings (API keys, preferences)

---

## Communication Protocols

### Zotero Plugin ↔ Tauri App

```typescript
// Tauri app calls Zotero API
const response = await fetch("http://localhost:23119/api/papers/search?q=transformer");
const papers = await response.json();
```

### LangGraph Agent ↔ LLM

```typescript
// LangChain handles LLM communication
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  configuration: {
    apiKey: localStorage.getItem("openai_api_key"),
  },
});
```

### Agent Tool ↔ Zotero API

```typescript
// Tool implementation
const zoteroSearchTool = new DynamicStructuredTool({
  name: "zotero_search",
  func: async ({ query }) => {
    const response = await fetch(
      `http://localhost:23119/api/papers/search?q=${encodeURIComponent(query)}`
    );
    return await response.json();
  },
});
```

---

## Development Workflow

### Phase 1: Zotero Data API

1. Create `src/modules/vibeServer.ts` - HTTP server using Zotero's built-in server
2. Implement data endpoints:
   - `/api/papers` - List papers
   - `/api/papers/search` - Search functionality
   - `/api/papers/:id` - Paper details
   - `/api/papers/:id/pdf` - PDF text extraction
3. Test with `curl` or browser

### Phase 2: Tauri App Scaffold

1. Initialize Tauri project: `pnpm create tauri-app vibe-research`
2. Setup React + TypeScript + Tailwind
3. Configure window settings in `tauri.conf.json`

### Phase 3: LangGraph Agent

1. Install dependencies:
   ```bash
   pnpm add @langchain/langgraph @langchain/openai @langchain/core
   ```
2. Define agent state and graph
3. Implement tools for Zotero API
4. Test agent logic

### Phase 4: Chat UI

1. Build React components
2. Connect to LangGraph agent
3. Implement streaming responses
4. Add paper card visualization

### Phase 5: Integration

1. Configure Tauri to start with Zotero plugin
2. Implement window management
3. Handle lifecycle (open/close)
4. End-to-end testing

---

## Distribution

### Option 1: Separate Packages

```
zoteroofmine.xpi              (~5MB)   Plugin only
vibe-research-win.exe         (~15MB)  Windows app
vibe-research-mac.dmg         (~15MB)  macOS app
vibe-research-linux.AppImage  (~15MB)  Linux app
```

**Pros:** Smaller plugin size, independent updates
**Cons:** User needs to install two things

### Option 2: Bundled by Platform

```
zoteroofmine-win.xpi          (~20MB)  Plugin + Windows app
zoteroofmine-mac.xpi          (~20MB)  Plugin + macOS app
zoteroofmine-linux.xpi        (~20MB)  Plugin + Linux app
```

**Pros:** Single installation
**Cons:** Larger download, platform-specific builds

---

## Security Considerations

| Concern | Solution |
|---------|----------|
| API Key Storage | Store in Tauri's secure storage, encrypt at rest |
| Local HTTP Server | Bind to localhost only, validate requests |
| LLM Data Privacy | User controls what data is sent to LLM |
| PDF Content | Only send necessary excerpts, not full PDFs by default |

---

## Configuration

### User Settings (Stored in Tauri)

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  },
  "zotero": {
    "port": 23119
  },
  "agent": {
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

### Zotero Plugin Preferences

- Server port (default: 23119)
- Enable/disable Vibe Research module
- Auto-start with Zotero

---

## Future Enhancements

1. **Multi-language Support**: Add support for Chinese and other languages
2. **Citation Analysis**: Agent can analyze citation networks
3. **Note Integration**: Save agent responses as Zotero notes
4. **Batch Operations**: Process multiple papers at once
5. **Local LLM**: Support Ollama for offline usage
6. **RAG Enhancement**: Index PDFs for better retrieval

---

## References

- [LangGraph JS Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangChain JS Documentation](https://js.langchain.com/)
- [Tauri Documentation](https://v2.tauri.app/)
- [Zotero Plugin Development](https://www.zotero.org/support/dev/zotero_7_for_developers)
