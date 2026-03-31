"""Command implementations for Zotero CLI."""

import json
from pathlib import Path
from typing import Optional

from .config import Config
from .database import Database


def output_json(data: dict | list, success: bool = True, error: Optional[str] = None) -> str:
    """Format output as JSON."""
    result = {"success": success}
    if error:
        result["error"] = error
    else:
        result["data"] = data
    return json.dumps(result, indent=2, ensure_ascii=False)


def cmd_search(config: Config, query: str, limit: int = 50) -> str:
    """Search items by query."""
    if not config.database_path:
        return output_json([], success=False, error="Zotero data directory not configured. Run 'zcli config init' first.")

    db = Database(config.database_path)
    try:
        items = db.search_items(query, limit=limit)
        return output_json([item.to_dict() for item in items])
    except Exception as e:
        return output_json([], success=False, error=str(e))
    finally:
        db.close()


def cmd_get(config: Config, key: str) -> str:
    """Get a single item by key."""
    if not config.database_path:
        return output_json({}, success=False, error="Zotero data directory not configured. Run 'zcli config init' first.")

    db = Database(config.database_path, config.data_dir)
    try:
        item = db.get_item(key)
        if item:
            return output_json(item.to_dict())
        else:
            return output_json({}, success=False, error=f"Item not found: {key}")
    except Exception as e:
        return output_json({}, success=False, error=str(e))
    finally:
        db.close()


def cmd_collections(config: Config) -> str:
    """List all collections."""
    if not config.database_path:
        return output_json([], success=False, error="Zotero data directory not configured. Run 'zcli config init' first.")

    db = Database(config.database_path)
    try:
        collections = db.get_collections()
        return output_json([c.to_dict() for c in collections])
    except Exception as e:
        return output_json([], success=False, error=str(e))
    finally:
        db.close()


def cmd_tags(config: Config) -> str:
    """List all tags."""
    if not config.database_path:
        return output_json([], success=False, error="Zotero data directory not configured. Run 'zcli config init' first.")

    db = Database(config.database_path)
    try:
        tags = db.get_tags()
        return output_json([t.to_dict() for t in tags])
    except Exception as e:
        return output_json([], success=False, error=str(e))
    finally:
        db.close()


def cmd_config_init(config: Config) -> str:
    """Initialize configuration interactively."""
    from .config import detect_zotero_data_dir

    detected = detect_zotero_data_dir()

    if detected:
        success = config.set_data_dir(detected)
        if success:
            return output_json({
                "message": "Configuration initialized",
                "data_dir": str(detected),
                "config_file": "~/.zcli/config.json",
            })
        else:
            return output_json({}, success=False, error=f"Invalid Zotero directory: {detected}")
    else:
        return output_json({}, success=False, error="Could not auto-detect Zotero data directory. Please set it manually with 'zcli config set data_dir <path>'")


def cmd_config_show(config: Config) -> str:
    """Show current configuration."""
    return output_json({
        "data_dir": str(config.data_dir) if config.data_dir else None,
        "source": config.source,
        "config_file": "~/.zcli/config.json",
    })


def cmd_config_set(config: Config, key: str, value: str) -> str:
    """Set a configuration value."""
    if key == "data_dir":
        path = Path(value).expanduser().resolve()
        if not path.exists():
            return output_json({}, success=False, error=f"Directory does not exist: {path}")
        if not (path / "zotero.sqlite").exists():
            return output_json({}, success=False, error=f"Not a valid Zotero data directory (missing zotero.sqlite): {path}")

        success = config.set_data_dir(path)
        if success:
            return output_json({
                "message": f"Set {key} = {path}",
                "data_dir": str(path),
            })
        else:
            return output_json({}, success=False, error="Failed to save configuration")
    else:
        return output_json({}, success=False, error=f"Unknown configuration key: {key}")
