"""Unit tests for database module."""

import pytest
from pathlib import Path

from zotero_cli.database import Database
from zotero_cli.models import Item, Collection, Tag


class TestDatabase:
    """Tests for Database class."""

    def test_database_connect(self, sample_db_path: Path | None):
        """Test database connection."""
        if sample_db_path is None:
            pytest.skip("Sample database not found")

        db = Database(sample_db_path)
        db.connect()
        db.close()

    def test_search_items(self, sample_db_path: Path | None):
        """Test item search functionality."""
        if sample_db_path is None:
            pytest.skip("Sample database not found")

        db = Database(sample_db_path)
        try:
            items = db.search_items("test", limit=10)
            assert isinstance(items, list)
            for item in items:
                assert isinstance(item, Item)
                assert item.key is not None
        finally:
            db.close()

    def test_get_item(self, sample_db_path: Path | None):
        """Test getting a single item."""
        if sample_db_path is None:
            pytest.skip("Sample database not found")

        db = Database(sample_db_path)
        try:
            # First search to get a valid key
            items = db.search_items("", limit=1)
            if items:
                item = db.get_item(items[0].key)
                assert item is not None
                assert item.key == items[0].key
        finally:
            db.close()

    def test_get_collections(self, sample_db_path: Path | None):
        """Test getting collections."""
        if sample_db_path is None:
            pytest.skip("Sample database not found")

        db = Database(sample_db_path)
        try:
            collections = db.get_collections()
            assert isinstance(collections, list)
            for c in collections:
                assert isinstance(c, Collection)
        finally:
            db.close()

    def test_get_tags(self, sample_db_path: Path | None):
        """Test getting tags."""
        if sample_db_path is None:
            pytest.skip("Sample database not found")

        db = Database(sample_db_path)
        try:
            tags = db.get_tags()
            assert isinstance(tags, list)
            for t in tags:
                assert isinstance(t, Tag)
                assert t.name is not None
        finally:
            db.close()
