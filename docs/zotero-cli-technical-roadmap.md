# Zotero CLI Technical Roadmap

> A standalone command-line interface for local Zotero database access, designed as LLM Tool Calling integration for Cherry Studio, Codex, and other AI clients.

## Overview

Zotero CLI provides direct read access to local Zotero SQLite databases. Each command is designed as an **LLM Tool** that can be called by AI assistants.

### Approach: Tool Calling (Not MCP Server)

| Approach | Description | Complexity |
|----------|-------------|------------|
| ~~MCP Server~~ | Long-running process, stdio/SSE protocol | High |
| **Tool Calling** | Execute CLI command per call, return JSON | Low |

Each tool invocation = one CLI execution, simple and stateless.

---

## Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Easy Distribution** | `uvx`/`npx` or standalone binary |
| **Offline-First** | Direct SQLite access, no API key needed |
| **Tool-Ready** | JSON output, designed for LLM consumption |
| **Cross-Platform** | macOS, Windows, Linux |

---

## Technology Stack

### Python (Recommended)

| Aspect | Choice |
|--------|--------|
| Language | Python 3.10+ |
| CLI Framework | Typer |
| SQLite | Built-in `sqlite3` |
| PDF Processing | PyMuPDF |
| Distribution | `uvx` / PyInstaller |

### TypeScript / Bun (Alternative)

| Aspect | Choice |
|--------|--------|
| Language | TypeScript |
| Runtime | Bun |
| CLI Framework | Citty |
| SQLite | better-sqlite3 |
| PDF Processing | pdf-parse |

### Recommendation

- **Python**: Faster development, better PDF library, simpler distribution
- **TypeScript**: Tight integration with Vibe Research (same stack)

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  LLM Client  │────▶│   Zotero CLI │────▶│   Response   │
│(Cherry/Codex)│     │   (Execute)  │     │    (JSON)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                          │
       │  1. LLM decides to call tool             │
       │  2. Client executes CLI command          │
       │  3. CLI returns JSON result              │
       │  4. Client sends result to LLM           │
       └──────────────────────────────────────────┘
```

---

## Alternatives Considered

### pyzotero CLI

[pyzotero](https://github.com/urschrei/pyzotero) (1.1k+ stars) includes a CLI for searching local Zotero libraries.

**Architecture:**
```
┌─────────────────┐     HTTP      ┌─────────────────┐
│ pyzotero CLI    │ ──────────▶  │ Zotero 7 App    │
│ (client)        │              │ (Local API)     │
└─────────────────┘              └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ zotero.sqlite   │
                                 └─────────────────┘
```

**Requires Zotero running because:**
- Uses Zotero 7's built-in local API server
- Must enable "Allow other applications on this computer to communicate with Zotero"

### Feature Comparison

| Feature | pyzotero CLI | Our Zotero CLI |
|---------|--------------|----------------|
| **Data Source** | Local API (needs Zotero running) | Direct SQLite (fully offline) |
| **Dependencies** | Zotero 7 + enable local API | None (just file access) |
| `search` | ✅ | ✅ |
| `--fulltext` | ✅ (uses Zotero index) | ✅ (extract ourselves) |
| `listcollections` | ✅ | ✅ |
| `itemtypes` | ✅ | Can add |
| `pdf` extract | ❌ | ✅ `zotero pdf <key>` |
| `annotations` | ❌ | ✅ `zotero annotations <key>` |
| `recent` | ❌ | ✅ `zotero recent` |
| `tags` | ❌ | ✅ `zotero tags` |
| **Output** | text / JSON | JSON (structured) |
| **Tool Calling** | Partial | Fully optimized |

### Why Direct SQLite Access?

| Aspect | Local API (pyzotero) | Direct SQLite (ours) |
|--------|---------------------|---------------------|
| **Availability** | Requires Zotero running | Always available |
| **Dependencies** | Application + settings | File system only |
| **Full-text Search** | Uses existing index | Need to extract PDFs |
| **Data Consistency** | Guaranteed by Zotero | Must handle schema |
| **Control** | Limited to API | Full database access |
| **Lightweight** | No (requires app) | Yes (single CLI) |

### Our Choice: Direct SQLite

**Reasons:**
1. **Tool Calling scenarios** - User may not have Zotero open when chatting with AI
2. **Lighter weight** - No process dependencies
3. **More control** - Not affected by Zotero API changes
4. **More features** - PDF extraction, annotations, recent items, tags

**Trade-off:**
- Must understand Zotero's SQLite schema
- Must handle PDF extraction ourselves
- May have edge cases with database locking (when Zotero is running)

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `zotero-cli search <query>` | Full-text search across library |
| `zotero-cli get <key>` | Get detailed item metadata |
| `zotero-cli pdf <key>` | Extract PDF text content |
| `zotero-cli collections` | List all collections/folders |
| `zotero-cli tags` | List tags with usage counts |
| `zotero-cli annotations <key>` | Get PDF highlights/notes |
| `zotero-cli recent` | Get recently added items |

All commands output JSON for LLM consumption.

---

## Tool Definitions

7 tools exposed to LLM clients:

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `zotero_search` | Search library | query, limit, item_type |
| `zotero_get_item` | Get item details | key |
| `zotero_extract_pdf` | Extract PDF text | key, pages, max_chars |
| `zotero_list_collections` | List collections | - |
| `zotero_list_tags` | List tags | limit |
| `zotero_get_annotations` | Get highlights | key |
| `zotero_recent` | Recent items | days, limit |

---

## Client Integration

### Supported Clients

| Client | Integration Method |
|--------|-------------------|
| Cherry Studio | Custom tools config |
| Codex / OpenCode | YAML tool definitions |
| Claude Desktop | Via tool calling |
| Custom | Execute CLI via subprocess |

### Integration Pattern

```
LLM Client Configuration:
  - Define tool schemas (JSON Schema)
  - Map each tool to CLI command
  - Set ZOTERO_DATA_DIR environment variable

Execution Flow:
  1. LLM selects tool based on user query
  2. Client executes: zotero-cli <command> <args>
  3. CLI returns JSON result
  4. LLM processes result and responds
```

---

## Integration with Vibe Research

```
┌─────────────────────────────────────────────────────────────┐
│                    Vibe Research Stack                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐                                        │
│  │  Electron App   │  ← User Interface                      │
│  │  (Chat + Reader)│                                        │
│  └────────┬────────┘                                        │
│           │  Tool Calling                                   │
│           ▼                                                 │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │  Zotero CLI     │────▶│  Zotero SQLite  │               │
│  │  (Tool Runner)  │     │  + PDF Storage  │               │
│  └─────────────────┘     └─────────────────┘               │
│                                                             │
│  ┌─────────────────┐                                        │
│  │  LLM Backend    │  ← Calls tools via JSON Schema        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Roadmap

### Phase 1: Core CLI (v0.1.0)
- Project setup (Python or TypeScript)
- SQLite database connection
- Core commands: `search`, `get`, `collections`, `tags`
- JSON output format

### Phase 2: Tool Integration (v0.2.0)
- Tool schema definitions
- Test with Cherry Studio / Codex
- Error handling

### Phase 3: PDF Processing (v0.3.0)
- PDF text extraction
- Page range support
- Annotation retrieval (Zotero 7+)

### Phase 4: Distribution (v0.4.0)
- Package publishing (PyPI / npm)
- Standalone binaries
- Documentation

### Phase 5: Vibe Research Integration (v1.0.0)
- Tight integration with Electron app
- Shared configuration
- Custom workflow tools

