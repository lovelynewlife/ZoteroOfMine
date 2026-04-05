# CCP and zcli Integration

## CCP to zcli Command Mapping

When CCP context is received, use these zcli commands for further exploration:

| CCP Context | zcli Command | Purpose |
|-------------|--------------|---------|
| `item.key` exists | `zcli get <key>` | Get full metadata |
| `item.title` | `zcli search "<title>"` | Find related papers |
| `item.authors` | `zcli search "<author>"` | Find papers by author |
| Multiple items | `zcli get <key1> <key2> ...` | Batch retrieval |

## Example Workflow

### Step 1: Detect CCP
```javascript
// User pastes clipboard content
const text = clipboard.readText();
const ccp = JSON.parse(text);

if (ccp.ccp === "1.0" && ccp.source === "zotero") {
  // CCP detected
}
```

### Step 2: Extract Context
```javascript
const items = ccp.items || [ccp.item];
const keys = items.map(i => i.key);
const titles = items.map(i => i.title);
```

### Step 3: Optional zcli Enhancement
```bash
# Get full metadata for first item
zcli get XQRMYQUN

# Search for related papers
zcli search "transformer attention"
```

## CCP Fields Reference

| Field | Type | Description | zcli Usage |
|-------|------|-------------|------------|
| `ccp` | string | Protocol version "1.0" | - |
| `source` | string | Origin app (e.g., "zotero") | - |
| `item.key` | string | Zotero item key | `zcli get <key>` |
| `item.title` | string | Paper title | `zcli search "<title>"` |
| `item.authors` | array | Author names | `zcli search "<author>"` |
| `item.year` | string | Publication year | Filter context |
| `item.doi` | string | DOI identifier | External lookup |
| `item.url` | string | URL | External lookup |
| `hint` | string | Usage suggestion | Guide user |

## Prompt Template for AI

When CCP context is received:

```
Context received from Zotero:
- Title: {item.title}
- Authors: {item.authors.join(', ')}
- Year: {item.year}
- Key: {item.key}

Available actions:
1. Get full metadata: zcli get {item.key}
2. Search related papers: zcli search "{keywords from title}"
3. Find more by author: zcli search "{item.authors[0]}"

How would you like to proceed?
```

## Notes

- CCP is designed for offline, local-first usage
- zcli is optional - AI can work with CCP context directly
- `hint` field provides guidance but AI can decide best approach
- Always verify item key format (8 uppercase characters) before calling zcli
