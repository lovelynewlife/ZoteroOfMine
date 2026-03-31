"""MCP server wrapper for zcli commands."""

import json
from typing import Any

from .commands import (
    cmd_collections,
    cmd_config_init,
    cmd_config_set,
    cmd_config_show,
    cmd_get,
    cmd_search,
    cmd_tags,
)
from .config import Config


def _parse_command_output(raw_output: str) -> dict[str, Any]:
    """Parse command JSON payload with a consistent fallback shape."""
    try:
        payload = json.loads(raw_output)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass

    return {
        "success": False,
        "error": "Invalid command output (expected JSON object)",
        "raw_output": raw_output,
    }


def _run_with_config(command: Any, *args: Any, **kwargs: Any) -> dict[str, Any]:
    """Execute a command function with fresh config and parse its output."""
    config = Config()
    result = command(config, *args, **kwargs)
    return _parse_command_output(result)


def _load_fastmcp() -> Any:
    """Import FastMCP lazily so zcli works without MCP dependency by default."""
    try:
        from mcp.server.fastmcp import FastMCP  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Missing MCP dependency. Install with: pip install -e '.[mcp]'"
        ) from exc
    return FastMCP


def create_server() -> Any:
    """Create and configure the zcli MCP server instance."""
    FastMCP = _load_fastmcp()
    mcp = FastMCP("zcli")

    @mcp.tool(name="zcli_search_items")
    def search_items(query: str, limit: int = 50) -> dict[str, Any]:
        """Search Zotero items by title or abstract."""
        if limit < 1:
            return {"success": False, "error": "limit must be >= 1", "data": []}
        return _run_with_config(cmd_search, query, limit)

    @mcp.tool(name="zcli_get_item")
    def get_item(key: str) -> dict[str, Any]:
        """Get a single Zotero item by key."""
        return _run_with_config(cmd_get, key)

    @mcp.tool(name="zcli_list_collections")
    def list_collections() -> dict[str, Any]:
        """List Zotero collections."""
        return _run_with_config(cmd_collections)

    @mcp.tool(name="zcli_list_tags")
    def list_tags() -> dict[str, Any]:
        """List Zotero tags."""
        return _run_with_config(cmd_tags)

    @mcp.tool(name="zcli_show_config")
    def show_config() -> dict[str, Any]:
        """Show zcli configuration."""
        return _run_with_config(cmd_config_show)

    @mcp.tool(name="zcli_init_config")
    def init_config() -> dict[str, Any]:
        """Auto-detect and initialize zcli configuration."""
        return _run_with_config(cmd_config_init)

    @mcp.tool(name="zcli_set_data_dir")
    def set_data_dir(data_dir: str) -> dict[str, Any]:
        """Set Zotero data directory (path containing zotero.sqlite)."""
        return _run_with_config(cmd_config_set, "data_dir", data_dir)

    return mcp


def main() -> None:
    """Run zcli MCP server over stdio."""
    create_server().run()


if __name__ == "__main__":
    main()
