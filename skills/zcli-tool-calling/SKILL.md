---
name: zcli-tool-calling
description: Reliable invocation workflow for Zotero `zcli` and `zcli-mcp` from Codex. Use when tasks require searching local Zotero items, reading item metadata by key, listing collections/tags, checking zcli configuration, or repairing zcli setup in CLI/MCP environments. Trigger on requests mentioning Zotero local database, `zcli`, `zcli-mcp`, MCP tool calls, bibliography lookup, collection/tag exploration, or config issues such as missing `zotero.sqlite`.
---

# Zcli Tool Calling

## Overview
Use this skill to execute Zotero retrieval tasks through `zcli` with stable, auditable outputs. Prefer MCP tools when available; fall back to CLI commands when MCP is missing or broken.

## Workflow
1. Confirm runtime path
- Run `command -v zcli`.
- If MCP is requested, also run `command -v zcli-mcp`.
- If either is missing, report exact missing binary and stop.

2. Confirm configuration before data queries
- Prefer `zcli config show` first.
- If `success=false` or data_dir is empty, run `zcli config init`.
- If auto-detect fails, set manually: `zcli config set data_dir <path-containing-zotero.sqlite>`.

3. Choose execution mode
- Use MCP mode when the session has registered MCP server `zcli` and the request is tool-centric.
- Use CLI mode for local debugging, shell-first workflows, or when MCP is unavailable.

4. Execute the minimum command/tool set
- Search: `zcli search "<query>" --limit <n>`
- Single item: `zcli get <item_key>`
- Collections: `zcli collections`
- Tags: `zcli tags`
- Config: `zcli config show`

5. Validate JSON and summarize
- Treat output as JSON object with `success` field.
- If `success=true`, summarize concise facts from `data`.
- If `success=false`, surface `error` verbatim and give one concrete recovery action.

## MCP Tool Map
When MCP server `zcli` is connected, call these tools directly:
- `zcli_search_items(query: str, limit: int = 50)`
- `zcli_get_item(key: str)`
- `zcli_list_collections()`
- `zcli_list_tags()`
- `zcli_show_config()`
- `zcli_init_config()`
- `zcli_set_data_dir(data_dir: str)`

Use `zcli_init_config` first when setup is unknown. Use `zcli_set_data_dir` only with a verified directory containing `zotero.sqlite`.

## Error Handling Rules
- Error `Zotero data directory not configured`: run config init, then set `data_dir` manually if needed.
- Error `Not a valid Zotero data directory`: verify path points to folder containing `zotero.sqlite`.
- Error `Item not found`: confirm key format (e.g. `ABCD1234`) and retry with correct key.
- Invalid JSON or malformed payload: rerun command once, then report raw output with probable cause.

## Output Contract for Responses
Always return:
1. What was executed (MCP tool names or CLI commands)
2. Result status (`success=true/false`)
3. Key data points (titles/keys/authors/year etc.)
4. Next action only if required (setup fix, retry, narrower query)

Keep responses short and operational. Do not invent Zotero records when output is empty.

## References
- For exact command and MCP signatures, read `references/zcli-command-map.md`.
