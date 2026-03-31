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
        self._read_only: bool = True
        self._source: str = "default"
        self._load()

    @staticmethod
    def parse_bool(value: str) -> Optional[bool]:
        """Parse bool-like string values."""
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return None

    def _save(self) -> None:
        """Persist current configuration to file."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        payload: dict[str, str | bool] = {"read_only": self._read_only}
        if self._data_dir:
            payload["data_dir"] = str(self._data_dir)
        with open(CONFIG_FILE, "w") as f:
            json.dump(payload, f, indent=2)

    def _load(self) -> None:
        """Load configuration from file."""
        file_data: dict = {}
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE) as f:
                    loaded = json.load(f)
                if isinstance(loaded, dict):
                    file_data = loaded
            except json.JSONDecodeError:
                file_data = {}

        # Read-only mode: env var > config file > default (True)
        env_read_only = os.environ.get("ZOTERO_DB_READ_ONLY")
        if env_read_only is not None:
            parsed = self.parse_bool(env_read_only)
            if parsed is not None:
                self._read_only = parsed
            else:
                read_only = file_data.get("read_only")
                if isinstance(read_only, bool):
                    self._read_only = read_only
        else:
            read_only = file_data.get("read_only")
            if isinstance(read_only, bool):
                self._read_only = read_only

        # Check environment variable first
        env_dir = os.environ.get("ZOTERO_DATA_DIR")
        if env_dir:
            path = Path(env_dir)
            if (path / "zotero.sqlite").exists():
                self._data_dir = path
                self._source = "environment"
                return

        # Check config file
        data_dir = file_data.get("data_dir")
        if isinstance(data_dir, str):
            path = Path(data_dir)
            if (path / "zotero.sqlite").exists():
                self._data_dir = path
                self._source = "config file"
                return

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
    def read_only(self) -> bool:
        """Get read-only database mode."""
        return self._read_only

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
        self._save()
        return True

    def set_read_only(self, read_only: bool) -> None:
        """Set database read-only mode and save to config file."""
        self._read_only = read_only
        self._save()

    def to_dict(self) -> dict:
        """Return configuration as dictionary."""
        return {
            "data_dir": str(self._data_dir) if self._data_dir else None,
            "read_only": self._read_only,
            "source": self._source,
        }
