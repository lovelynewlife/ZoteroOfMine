# Clipboard Context Protocol (CCP)

> An open protocol for structured context exchange via clipboard, enabling seamless integration between any application and AI clients.

## Overview

Current AI chat interfaces lack a standardized way to receive structured context from external applications. Each integration requires custom plugins or APIs, creating fragmentation.

**CCP (Clipboard Context Protocol)** solves this by defining an open, clipboard-based format that any application can produce and any AI client can consume.

### The Problem

| Application | Context Input Method | Limitation |
|-------------|---------------------|------------|
| ChatGPT | Plain text | No structured context |
| Claude Desktop | Plain text | No structured context |
| Cursor | IDE context only | Closed ecosystem |
| Copilot | IDE context only | Closed ecosystem |
| Notion AI | Page context only | Closed ecosystem |
| Cherry Studio | Text + Tool Calling | No input-side structured context |

**Result**: Every app needs its own plugin, its own API, its own integration effort.

### The Solution

```
Current (Fragmented):

Zotero ──✕── ChatGPT
Browser ──✕── Claude  
IDE ──✕── Cherry Studio
        (each needs custom plugin)


With CCP (Unified):

Zotero ──┐
Browser ──┼── Clipboard (CCP format) ──▶ Any AI Client
IDE ───────┤                                  ↑
Obsidian ──┘                         One protocol, universal access
```

---

## Protocol Definition

### Version

- Current: `1.0`
- MIME Type: `application/x-context+json`

### Format Options

#### Option A: JSON (Recommended)

```json
{
  "ccp": "1.0",
  "source": {
    "app": "zotero",
    "version": "7.0.0"
  },
  "type": "selection",
  "timestamp": "2024-01-15T10:30:00Z",
  "meta": {
    "title": "Attention Is All You Need",
    "url": "zotero://select/items/ABCD1234",
    "page": 3
  },
  "content": {
    "text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
    "html": "<p>The dominant sequence...</p>"
  }
}
```

#### Option B: Markdown + YAML Front Matter

```markdown
---
ccp: "1.0"
source: zotero
type: selection
meta:
  title: Attention Is All You Need
  page: 3
---

The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...
```

#### Option C: Text Block (Simplest)

```
---CCP---
version: 1.0
source: zotero
type: selection
title: Attention Is All You Need
page: 3
---CONTENT---
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...
---END---
```

---

## Field Specification

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `ccp` | string | Protocol version, e.g., `"1.0"` |
| `source.app` | string | Source application identifier |
| `type` | string | Content type (see below) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `source.version` | string | Source app version |
| `timestamp` | string | ISO 8601 timestamp |
| `meta` | object | Custom metadata |
| `content.text` | string | Plain text content |
| `content.html` | string | HTML formatted content |
| `content.image` | string | Base64 encoded image |
| `content.file` | object | File reference (see File Mode) |
| `content.preview` | string | Preview text for file references |

### Content Types

| Type | Description | Example Sources |
|------|-------------|-----------------|
| `selection` | Selected text | Zotero, Browser, PDF reader |
| `document` | Full document | Zotero, Notion, Obsidian |
| `annotation` | Highlight/Note | Zotero, PDF reader |
| `code` | Code snippet | VS Code, JetBrains |
| `quote` | Citation/Quote | Browser, Academic tools |
| `image` | Image with context | Screenshot tools |
| `file` | File reference | File managers |
| `custom` | Custom type | Any application |

---

## File Mode (Large Content Handling)

Clipboard has size limitations (typically ~4MB on Windows, varies by system). For large content (full PDFs, long documents, code files), use **File Mode**.

### How It Works

```
Producer:
1. Generate content → Save to temporary file
2. Create CCP with file reference → Copy to clipboard

Consumer:
1. Parse CCP → Detect file reference
2. Read file content → Use as context
3. Optionally clean up temp file
```

### File Reference Format

```json
{
  "ccp": "1.0",
  "source": { "app": "zotero" },
  "type": "document",
  "meta": {
    "title": "Attention Is All You Need",
    "format": "pdf",
    "size": 245760
  },
  "content": {
    "preview": "The dominant sequence transduction models are based on complex recurrent...",
    "file": {
      "path": "/tmp/ccp-zotero-abc123.txt",
      "uri": "file:///tmp/ccp-zotero-abc123.txt",
      "format": "text",
      "encoding": "utf-8",
      "expires": "2024-01-15T12:00:00Z"
    }
  }
}
```

### File Reference Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes* | Local file path |
| `uri` | string | Yes* | File URI (file://) |
| `format` | string | Yes | Content format: `text`, `markdown`, `html`, `json`, `pdf`, `image` |
| `encoding` | string | No | Text encoding (default: `utf-8`) |
| `size` | number | No | File size in bytes |
| `expires` | string | No | ISO 8601 timestamp for cleanup |

*At least one of `path` or `uri` is required.

### Preview Field

Always include a `preview` (first ~500 chars) so consumers can:
- Show context preview without reading file
- Handle file read failures gracefully

### Recommended File Locations

| OS | Location | Notes |
|----|----------|-------|
| **macOS/Linux** | `/tmp/ccp-{app}-{id}.{ext}` | Auto-cleaned on reboot |
| **Windows** | `%TEMP%\ccp-{app}-{id}.{ext}` | User temp folder |
| **Cross-platform** | `{cacheDir}/ccp/{app}/{id}.{ext}` | App cache directory |

### File Naming Convention

```
ccp-{app}-{timestamp|random-id}.{ext}

Examples:
- ccp-zotero-1705312345.txt
- ccp-vscode-a7f3b2.md
- ccp-browser-x9k2m1.html
```

### Cleanup Strategy

**Producers should:**
1. Create files with reasonable expiry (e.g., 1 hour)
2. Clean up old files on app startup
3. Use unique IDs to avoid collisions

**Consumers should:**
1. Read file immediately after paste
2. Optionally cache content for session
3. Not delete files (producer's responsibility)

### Example: Full PDF Export

```javascript
// Zotero Plugin - Copy Full PDF
async function copyFullPDF(item) {
  const pdfText = await extractPDFText(item);
  const preview = pdfText.substring(0, 500);
  
  // Save to temp file
  const tempFile = `/tmp/ccp-zotero-${Date.now()}.txt`;
  await fs.writeFile(tempFile, pdfText);
  
  const ccp = {
    ccp: "1.0",
    source: { app: "zotero" },
    type: "document",
    meta: {
      title: item.title,
      format: "pdf",
      size: pdfText.length,
      pages: item.numPages
    },
    content: {
      preview,
      file: {
        path: tempFile,
        format: "text",
        encoding: "utf-8",
        expires: new Date(Date.now() + 3600000).toISOString()
      }
    }
  };
  
  clipboard.writeText(JSON.stringify(ccp, null, 2));
}
```

### Consumer: Reading File Content

```javascript
async function resolveCCPContent(ccp) {
  // Direct content
  if (ccp.content.text) {
    return ccp.content.text;
  }
  
  // File reference
  if (ccp.content.file) {
    const { path, uri, format } = ccp.content.file;
    
    // Check if file exists
    const filePath = path || uri.replace('file://', '');
    if (!fs.existsSync(filePath)) {
      console.warn('CCP file not found:', filePath);
      return ccp.content.preview || '[File not found]';
    }
    
    // Read based on format
    if (format === 'text' || format === 'markdown' || format === 'html') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    
    if (format === 'json') {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    
    if (format === 'pdf') {
      // Consumer needs PDF parser
      return await parsePDF(filePath);
    }
    
    // Fallback
    return fs.readFileSync(filePath);
  }
  
  return null;
}
```

### Hybrid Mode (Text + File)

For moderate content, include both inline text and file reference:

```json
{
  "ccp": "1.0",
  "source": { "app": "zotero" },
  "type": "selection",
  "content": {
    "text": "Moderate length content here...",
    "file": {
      "path": "/tmp/ccp-zotero-full.txt",
      "format": "text"
    }
  }
}
```

Consumers can choose based on their needs:
- Quick preview: use `text`
- Full analysis: read `file`

---

## Source Identifiers

Common source app identifiers (lowercase, hyphen-separated):

| Identifier | Application |
|------------|-------------|
| `zotero` | Zotero |
| `browser` | Web browser |
| `vscode` | Visual Studio Code |
| `obsidian` | Obsidian |
| `notion` | Notion |
| `cursor` | Cursor |
| `chatgpt` | ChatGPT |
| `claude` | Claude |

---

## Use Cases

### Academic Research (Zotero → AI Client)

```
User in Zotero:
1. Select text from a PDF
2. Copy (Ctrl/Cmd + C)
3. CCP formatted content in clipboard

User in AI Client:
1. Paste (Ctrl/Cmd + V)
2. AI client detects CCP format
3. Parses and displays structured context
4. User can ask questions about the content
```

**CCP Payload:**
```json
{
  "ccp": "1.0",
  "source": { "app": "zotero" },
  "type": "selection",
  "meta": {
    "item-key": "ABCD1234",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani, A.", "Shazeer, N."],
    "year": 2017,
    "page": 3,
    "doi": "10.48550/arXiv.1706.03762"
  },
  "content": {
    "text": "The dominant sequence transduction models..."
  }
}
```

### Web Research (Browser → AI Client)

```json
{
  "ccp": "1.0",
  "source": { "app": "browser" },
  "type": "quote",
  "meta": {
    "url": "https://arxiv.org/abs/1706.03762",
    "title": "Attention Is All You Need",
    "selection": "paragraph"
  },
  "content": {
    "text": "The Transformer uses multi-head attention..."
  }
}
```

### Code Review (IDE → AI Client)

```json
{
  "ccp": "1.0",
  "source": { "app": "vscode" },
  "type": "code",
  "meta": {
    "language": "python",
    "file": "src/model.py",
    "line": "45-60"
  },
  "content": {
    "text": "def attention(query, key, value):\n    ..."
  }
}
```

### Multiple Contexts

Multiple contexts can be combined in an array:

```json
{
  "ccp": "1.0",
  "type": "multi",
  "contexts": [
    {
      "source": { "app": "zotero" },
      "type": "selection",
      "meta": { "title": "Paper A" },
      "content": { "text": "..." }
    },
    {
      "source": { "app": "browser" },
      "type": "quote",
      "meta": { "url": "https://..." },
      "content": { "text": "..." }
    }
  ]
}
```

---

## Client Implementation Guide

### Detection

```javascript
function isCCPContent(text) {
  // JSON format
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      return parsed.ccp !== undefined;
    } catch {}
  }
  
  // Markdown format
  if (text.startsWith('---\n') && text.includes('ccp:')) {
    return true;
  }
  
  // Text block format
  if (text.startsWith('---CCP---')) {
    return true;
  }
  
  return false;
}
```

### Parsing

```javascript
function parseCCP(text) {
  // Try JSON first
  if (text.startsWith('{')) {
    try {
      return JSON.parse(text);
    } catch {}
  }
  
  // Try Markdown front matter
  if (text.startsWith('---\n')) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      const meta = parseYAML(match[1]);
      const content = match[2];
      return { ...meta, content: { text: content } };
    }
  }
  
  // Try text block
  if (text.startsWith('---CCP---')) {
    // Parse text block format
  }
  
  return null;
}
```

### UI Integration

```
┌─────────────────────────────────────────────────────────┐
│  AI Client                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📎 Context (2)                              [展开/折叠] │
│  ┌───────────────────┐  ┌───────────────────┐          │
│  │ 📄 Zotero         │  │ 🌐 Browser        │          │
│  │ Attention Is...   │  │ arXiv paper...    │          │
│  │              [×]  │  │              [×]  │          │
│  └───────────────────┘  └───────────────────┘          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [输入消息...]                              [发送] [📎]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Sending to LLM

```javascript
function buildPrompt(userMessage, contexts) {
  if (!contexts || contexts.length === 0) {
    return userMessage;
  }
  
  const contextBlocks = contexts.map(ctx => {
    const source = ctx.source?.app || 'unknown';
    const title = ctx.meta?.title || '';
    const text = ctx.content?.text || '';
    
    return `[Context from ${source}]${title ? `: ${title}` : ''}\n${text}\n[/Context]`;
  }).join('\n\n');
  
  return `${contextBlocks}\n\nUser: ${userMessage}`;
}
```

---

## Producer Implementation Guide

### Zotero Plugin

```javascript
// Copy with CCP format
function copyWithContext() {
  const selection = getSelectedText();
  const item = getCurrentItem();
  
  const ccp = {
    ccp: "1.0",
    source: { app: "zotero", version: "7.0.0" },
    type: "selection",
    timestamp: new Date().toISOString(),
    meta: {
      "item-key": item.key,
      "title": item.title,
      "authors": item.creators,
      "year": item.year,
      "page": selection.page
    },
    content: {
      text: selection.text
    }
  };
  
  clipboard.writeText(JSON.stringify(ccp, null, 2));
}
```

### Browser Extension

```javascript
// Copy with CCP format
document.addEventListener('copy', (e) => {
  const selection = window.getSelection().toString();
  if (!selection) return;
  
  const ccp = {
    ccp: "1.0",
    source: { app: "browser" },
    type: "quote",
    meta: {
      url: window.location.href,
      title: document.title
    },
    content: { text: selection }
  };
  
  e.clipboardData.setData('application/x-context+json', JSON.stringify(ccp));
  e.clipboardData.setData('text/plain', JSON.stringify(ccp, null, 2));
  e.preventDefault();
});
```

---

## Ecosystem Vision

```
┌─────────────────────────────────────────────────────────┐
│                   CCP Ecosystem                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Producers (Copy)              Consumers (Paste)        │
│  ┌─────────────┐              ┌─────────────┐          │
│  │ Zotero      │              │ Vibe Research│          │
│  │ Browser     │              │ Cherry Studio│          │
│  │ VS Code     │── Clipboard ──▶│ Claude Desktop│         │
│  │ Obsidian    │   (CCP)      │ ChatGPT      │          │
│  │ Notion      │              │ Cursor       │          │
│  │ Any App     │              │ Any AI Client│          │
│  └─────────────┘              └─────────────┘          │
│                                                         │
│  Benefits:                                               │
│  • One protocol, universal access                       │
│  • No custom plugins needed                             │
│  • Open standard, community-driven                      │
│  • Works offline                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Roadmap

### Phase 1: Specification
- Finalize protocol format
- Write specification document
- Create reference implementations

### Phase 2: Implementation
- Vibe Research: CCP consumer
- Zotero Plugin: CCP producer
- Browser Extension: CCP producer

### Phase 3: Community
- Publish as open standard
- Create SDKs (JS, Python, Swift)
- Outreach to other projects

### Phase 4: Adoption
- Integrate with popular AI clients
- Plugin directory for producers
- Best practices documentation

---

## Comparison with Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| **CCP** | Universal, offline, no API needed, File Mode for large content | Requires file system access for File Mode |
| MCP | Rich protocol, bidirectional | Complex, requires server |
| Custom Plugins | Full control | High dev effort per app |
| API Integration | Powerful | Requires network, auth |

---

## References

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - Alternative approach for bidirectional communication
- [YAML Front Matter](https://jekyllrb.com/docs/front-matter/) - Inspiration for Markdown format
- [MIME Types](https://www.iana.org/assignments/media-types/media-types.xhtml) - Standard for content types

