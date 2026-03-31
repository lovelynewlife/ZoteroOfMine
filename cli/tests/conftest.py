"""Test fixtures for zcli."""

import pytest
from pathlib import Path

# Fixtures directory
FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_db_path() -> Path | None:
    """Return path to sample Zotero database if exists."""
    db_path = FIXTURES_DIR / "zotero.sqlite"
    if db_path.exists():
        return db_path
    return None


@pytest.fixture
def sample_data_dir() -> Path | None:
    """Return path to sample Zotero data directory if exists."""
    if FIXTURES_DIR.exists() and (FIXTURES_DIR / "zotero.sqlite").exists():
        return FIXTURES_DIR
    return None
