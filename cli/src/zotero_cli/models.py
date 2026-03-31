"""Data models for Zotero CLI."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Item:
    """Represents a Zotero item (article, book, etc.)."""

    key: str
    title: Optional[str] = None
    item_type: Optional[str] = None
    authors: list[str] = field(default_factory=list)
    year: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    publication: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON output."""
        return {
            "key": self.key,
            "title": self.title,
            "item_type": self.item_type,
            "authors": self.authors,
            "year": self.year,
            "abstract": self.abstract,
            "doi": self.doi,
            "url": self.url,
            "publication": self.publication,
        }


@dataclass
class Collection:
    """Represents a Zotero collection (folder)."""

    collection_id: int
    key: str
    name: str
    parent_id: Optional[int] = None
    parent_key: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON output."""
        return {
            "id": self.collection_id,
            "key": self.key,
            "name": self.name,
            "parent_id": self.parent_id,
            "parent_key": self.parent_key,
        }


@dataclass
class Tag:
    """Represents a Zotero tag."""

    tag_id: int
    name: str
    count: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON output."""
        return {
            "id": self.tag_id,
            "name": self.name,
            "count": self.count,
        }
