# zcli Command and MCP Map

## CLI Commands

### Search
```bash
zcli search "machine learning" --limit 10
```
- Returns JSON object with `success` and `data` (list of items).
- Item fields usually include: `key`, `title`, `item_type`, `authors`, `year`, `abstract`, `doi`, `url`, `publication`, `pdf_path`.

### Get Item by Key
```bash
zcli get ABCD1234
```
- Returns one item in `data` when found.
- Returns `success=false` with `error="Item not found: <key>"` when missing.

### Collections
```bash
zcli collections
```
- Returns list with collection metadata (`collection_id`, `key`, `name`, `parent_id`, `parent_key`).

### Tags
```bash
zcli tags
```
- Returns tag list.

### Configuration
```bash
zcli config show
zcli config init
zcli config set data_dir /path/to/Zotero
zcli config set read_only true
```

## MCP Tool Signatures
- `zcli_search_items(query: str, limit: int = 50)`
- `zcli_get_item(key: str)`
- `zcli_list_collections()`
- `zcli_list_tags()`
- `zcli_show_config()`
- `zcli_init_config()`
- `zcli_set_data_dir(data_dir: str)`

## Setup Checklist
1. `zcli --version`
2. `zcli config show`
3. If needed: `zcli config init`
4. If MCP required: `codex mcp add zcli -- zcli-mcp`

## Notes
- zcli command output is JSON text; parse before summarizing.
- `success=false` should be treated as command failure even if process exit code is 0.
- Prefer read-only DB access unless user explicitly requests write-like behavior.
