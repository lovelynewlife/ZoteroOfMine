"""Configuration management for Zotero CLI."""

import json
import os
import platform
from pathlib import Path
from typing import Optional


CONFIG_DIR = Path.home() / ".zcli"
CONFIG_FILE = CONFIG_DIR / "config.json"


def get_default_zotero_dirs() -> list[Path]:
    """Return possible Zotero data directories based on platform."""
    home = Path.home()
    system = platform.system()

    if system == "Darwin":  # macOS
        return [
            home / "Zotero",
            home / "Library" / "Application Support" / "Zotero",
        ]
    elif system == "Windows":
        appdata = os.environ.get("APPDATA", "")
        userprofile = os.environ.get("USERPROFILE", "")
        return [
            Path(userprofile) / "Zotero",
            Path(appdata) / "Zotero",
        ]
    else:  # Linux
        return [
            home / "Zotero",
            home / ".local" / "share" / "zotero",
        ]


def detect_zotero_data_dir() -> Optional[Path]:
    """Auto-detect Zotero data directory by checking for zotero.sqlite."""
    for path in get_default_zotero_dirs():
        if (path / "zotero.sqlite").exists():
            return path
    return None


class Config:
    """Configuration manager for Zotero CLI."""

    def __init__(self):
        self._data_dir: Optional[Path] = None
        self._source: str = "default"
        self._load()

    def _load(self) -> None:
        """Load configuration from file."""
        # Check environment variable first
        env_dir = os.environ.get("ZOTERO_DATA_DIR")
        if env_dir:
            path = Path(env_dir)
            if (path / "zotero.sqlite").exists():
                self._data_dir = path
                self._source = "environment"
                return

        # Check config file
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE) as f:
                    data = json.load(f)
                if "data_dir" in data:
                    path = Path(data["data_dir"])
                    if (path / "zotero.sqlite").exists():
                        self._data_dir = path
                        self._source = "config file"
                        return
            except (json.JSONDecodeError, KeyError):
                pass

        # Auto-detect
        detected = detect_zotero_data_dir()
        if detected:
            self._data_dir = detected
            self._source = "auto-detect"

    @property
    def data_dir(self) -> Optional[Path]:
        """Get Zotero data directory."""
        return self._data_dir

    @property
    def source(self) -> str:
        """Get configuration source."""
        return self._source

    @property
    def database_path(self) -> Optional[Path]:
        """Get path to zotero.sqlite."""
        if self._data_dir:
            return self._data_dir / "zotero.sqlite"
        return None

    def set_data_dir(self, path: Path) -> bool:
        """Set Zotero data directory and save to config file."""
        if not (path / "zotero.sqlite").exists():
            return False

        self._data_dir = path
        self._source = "config file"

        # Save to file
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            json.dump({"data_dir": str(path)}, f, indent=2)

        return True

    def to_dict(self) -> dict:
        """Return configuration as dictionary."""
        return {
            "data_dir": str(self._data_dir) if self._data_dir else None,
            "source": self._source,
        }
