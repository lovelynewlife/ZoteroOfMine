---
name: ccp-context-protocol
description: Clipboard Context Protocol (CCP) for structured context exchange between Zotero and AI clients. Use when user pastes content from Zotero, needs to parse CCP JSON format, or wants to copy Zotero items as AI context. Trigger on CCP-formatted clipboard content, requests mentioning "Copy as AI Context", or structured context from Zotero.
---

# CCP Context Protocol

## Overview
CCP (Clipboard Context Protocol) is an open protocol for structured context exchange via clipboard. It enables seamless integration between Zotero and AI clients without custom plugins.

## CCP Data Structure

### Single Item
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "item": {
    "key": "XQRMYQUN",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani, A.", "Shazeer, N."],
    "year": "2017",
    "doi": "10.48550/arXiv.1706.03762",
    "url": "https://arxiv.org/abs/1706.03762"
  },
  "hint": "You can use zcli commands..."
}
```

### Multiple Items
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "items": [
    { "key": "AAA", "title": "...", ... },
    { "key": "BBB", "title": "...", ... }
  ],
  "hint": "..."
}
```

### PDF Text Selection
When user selects text in PDF reader and copies as AI context:
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "item": {
    "key": "XQRMYQUN",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani, A.", "Shazeer, N."],
    "year": "2017"
  },
  "selection": {
    "text": "The Transformer uses multi-head attention to allow the model to jointly attend to information from different representation subspaces at different positions.",
    "pageLabel": "3"
  },
  "hint": "The user selected this text from a PDF in Zotero. You can use zcli commands..."
}
```

The `selection` field indicates:
- `text`: The selected text content
- `pageLabel`: (optional) The page number where the text was selected

## Detection and Parsing

### Detection Rules
1. Check if clipboard content starts with `{`
2. Parse as JSON and verify `ccp` field exists
3. Validate `ccp` version is `"1.0"`
4. Check `source` to determine context origin

### Parsing Workflow
```
1. Read clipboard text
2. if text starts with '{':
     try JSON.parse(text)
     if parsed.ccp exists:
       return CCP context
3. else:
     treat as plain text
```

## Integration with zcli

CCP includes a `hint` field that suggests using zcli for deeper exploration:

```
hint: "You can use zcli commands (e.g., zcli get KEY, zcli search) 
       to get more information. Feel free to handle this context 
       in your own way if zcli is not available."
```

### Recommended Actions

When CCP context is detected:

| Context Type | Recommended Action |
|--------------|-------------------|
| Single item with key | `zcli get <key>` for full metadata |
| PDF selection | Focus on the selected text, use item for context |
| Research topic | `zcli search "<title keywords>"` |
| Author exploration | `zcli search "<author name>"` |
| No zcli available | Use inline context directly |

## Usage Examples

### Example 1: User Pastes Paper Context

**Input (CCP from clipboard):**
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "item": {
    "key": "XQRMYQUN",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani, A."],
    "year": "2017"
  },
  "hint": "..."
}
```

**AI Response:**
```
I see you've shared a paper from Zotero:

📄 **Attention Is All You Need** (2017)
Authors: Vaswani, A.

Would you like me to:
1. Search your library for related papers?
2. Get the full citation information?
3. Summarize the abstract?

[uses zcli get XQRMYQUN if user confirms]
```

### Example 2: Multiple Papers

**Input:**
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "items": [
    { "key": "AAA", "title": "Paper 1", ... },
    { "key": "BBB", "title": "Paper 2", ... }
  ]
}
```

**AI Response:**
```
You've shared 2 papers from Zotero:

1. Paper 1 (2023)
2. Paper 2 (2022)

How would you like me to help with these papers?
```

### Example 3: PDF Text Selection

**Input (CCP with selection from PDF):**
```json
{
  "ccp": "1.0",
  "source": "zotero",
  "item": {
    "key": "XQRMYQUN",
    "title": "Attention Is All You Need",
    "authors": ["Vaswani, A.", "Shazeer, N."],
    "year": "2017"
  },
  "selection": {
    "text": "The Transformer uses multi-head attention to allow the model to jointly attend to information from different representation subspaces at different positions.",
    "pageLabel": "3"
  },
  "hint": "The user selected this text from a PDF in Zotero..."
}
```

**AI Response:**
```
I see you've selected a passage from "Attention Is All You Need" (page 3):

> "The Transformer uses multi-head attention to allow the model to jointly attend to information from different representation subspaces at different positions."

This describes the multi-head attention mechanism, a key innovation in the Transformer architecture. Would you like me to:

1. Explain this concept in more detail?
2. Find related papers on attention mechanisms?
3. Search your Zotero library for other papers by these authors?
```

## Error Handling

| Issue | Solution |
|-------|----------|
| Invalid JSON | Treat as plain text, ask user for clarification |
| Missing `ccp` field | Not a CCP context, process normally |
| Unknown `source` | Still usable, but skip source-specific actions |
| Missing zcli | Use inline context, skip tool calls |

## Output Contract

When CCP context is processed, return:
1. Confirmation of context type (single/multiple items)
2. Brief summary of items (title, authors, year)
3. Suggested next actions based on context

## References
- For zcli command details, see `references/ccp-zcli-integration.md`
- For full CCP specification, see project `docs/clipboard-context-protocol.md`
