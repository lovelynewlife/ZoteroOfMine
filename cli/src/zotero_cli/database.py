"""SQLite database queries for Zotero CLI."""

import re
import sqlite3
from pathlib import Path
from typing import Optional

from .models import Collection, Item, Tag


class Database:
    """Zotero SQLite database wrapper."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    def connect(self) -> None:
        """Open database connection."""
        self._conn = sqlite3.connect(
            self.db_path, uri=True, check_same_thread=False
        )
        self._conn.row_factory = sqlite3.Row

    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def _ensure_connected(self) -> sqlite3.Connection:
        """Ensure database connection is open."""
        if not self._conn:
            self.connect()
        return self._conn  # type: ignore

    def search_items(self, query: str, limit: int = 50) -> list[Item]:
        """Search items by title, authors, or year."""
        conn = self._ensure_connected()
        cursor = conn.cursor()

        # Build search pattern (case-insensitive, partial match)
        pattern = f"%{query}%"

        # Search in itemDataValues via itemData join
        # itemData: (itemID, fieldID, valueID)
        # itemDataValues: (valueID, value)
        sql = """
            SELECT DISTINCT
                i.itemID,
                i.key,
                it.typeName,
                v_title.value as title,
                v_date.value as date,
                v_doi.value as doi,
                v_url.value as url,
                v_publication.value as publication,
                v_abstract.value as abstract
            FROM items i
            JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
            LEFT JOIN itemData id_title ON i.itemID = id_title.itemID
                AND id_title.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'title')
            LEFT JOIN itemDataValues v_title ON id_title.valueID = v_title.valueID
            LEFT JOIN itemData id_date ON i.itemID = id_date.itemID
                AND id_date.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'date')
            LEFT JOIN itemDataValues v_date ON id_date.valueID = v_date.valueID
            LEFT JOIN itemData id_doi ON i.itemID = id_doi.itemID
                AND id_doi.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'DOI')
            LEFT JOIN itemDataValues v_doi ON id_doi.valueID = v_doi.valueID
            LEFT JOIN itemData id_url ON i.itemID = id_url.itemID
                AND id_url.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'url')
            LEFT JOIN itemDataValues v_url ON id_url.valueID = v_url.valueID
            LEFT JOIN itemData id_publication ON i.itemID = id_publication.itemID
                AND id_publication.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'publicationTitle')
            LEFT JOIN itemDataValues v_publication ON id_publication.valueID = v_publication.valueID
            LEFT JOIN itemData id_abstract ON i.itemID = id_abstract.itemID
                AND id_abstract.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'abstractNote')
            LEFT JOIN itemDataValues v_abstract ON id_abstract.valueID = v_abstract.valueID
            WHERE
                i.itemID NOT IN (SELECT itemID FROM deletedItems)
                AND (
                    v_title.value LIKE ? COLLATE NOCASE
                    OR v_abstract.value LIKE ? COLLATE NOCASE
                )
            ORDER BY i.dateAdded DESC
            LIMIT ?
        """

        cursor.execute(sql, (pattern, pattern, limit))
        rows = cursor.fetchall()

        items = []
        for row in rows:
            item_id = row["itemID"]
            key = row["key"]

            # Get authors for this item
            authors = self._get_authors(cursor, item_id)

            # Extract year from date
            year = None
            if row["date"]:
                year_match = re.search(r"\b(19|20)\d{2}\b", row["date"])
                if year_match:
                    year = int(year_match.group())

            items.append(
                Item(
                    key=key,
                    title=row["title"],
                    item_type=row["typeName"],
                    authors=authors,
                    year=year,
                    abstract=row["abstract"],
                    doi=row["doi"],
                    url=row["url"],
                    publication=row["publication"],
                )
            )

        return items

    def get_item(self, key: str) -> Optional[Item]:
        """Get a single item by its key."""
        conn = self._ensure_connected()
        cursor = conn.cursor()

        sql = """
            SELECT
                i.itemID,
                i.key,
                it.typeName,
                v_title.value as title,
                v_date.value as date,
                v_doi.value as doi,
                v_url.value as url,
                v_publication.value as publication,
                v_abstract.value as abstract
            FROM items i
            JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
            LEFT JOIN itemData id_title ON i.itemID = id_title.itemID
                AND id_title.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'title')
            LEFT JOIN itemDataValues v_title ON id_title.valueID = v_title.valueID
            LEFT JOIN itemData id_date ON i.itemID = id_date.itemID
                AND id_date.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'date')
            LEFT JOIN itemDataValues v_date ON id_date.valueID = v_date.valueID
            LEFT JOIN itemData id_doi ON i.itemID = id_doi.itemID
                AND id_doi.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'DOI')
            LEFT JOIN itemDataValues v_doi ON id_doi.valueID = v_doi.valueID
            LEFT JOIN itemData id_url ON i.itemID = id_url.itemID
                AND id_url.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'url')
            LEFT JOIN itemDataValues v_url ON id_url.valueID = v_url.valueID
            LEFT JOIN itemData id_publication ON i.itemID = id_publication.itemID
                AND id_publication.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'publicationTitle')
            LEFT JOIN itemDataValues v_publication ON id_publication.valueID = v_publication.valueID
            LEFT JOIN itemData id_abstract ON i.itemID = id_abstract.itemID
                AND id_abstract.fieldID = (SELECT fieldID FROM fields WHERE fieldName = 'abstractNote')
            LEFT JOIN itemDataValues v_abstract ON id_abstract.valueID = v_abstract.valueID
            WHERE i.key = ?
                AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
        """

        cursor.execute(sql, (key,))
        row = cursor.fetchone()

        if not row:
            return None

        item_id = row["itemID"]
        authors = self._get_authors(cursor, item_id)

        year = None
        if row["date"]:
            year_match = re.search(r"\b(19|20)\d{2}\b", row["date"])
            if year_match:
                year = int(year_match.group())

        return Item(
            key=row["key"],
            title=row["title"],
            item_type=row["typeName"],
            authors=authors,
            year=year,
            abstract=row["abstract"],
            doi=row["doi"],
            url=row["url"],
            publication=row["publication"],
        )

    def get_collections(self) -> list[Collection]:
        """Get all collections."""
        conn = self._ensure_connected()
        cursor = conn.cursor()

        # collections table has key column directly
        sql = """
            SELECT
                c.collectionID,
                c.collectionName,
                c.parentCollectionID,
                c.key
            FROM collections c
            WHERE c.collectionID NOT IN (SELECT collectionID FROM deletedCollections)
            ORDER BY c.collectionName
        """

        cursor.execute(sql)
        rows = cursor.fetchall()

        collections = []
        for row in rows:
            collections.append(
                Collection(
                    collection_id=row["collectionID"],
                    key=row["key"],
                    name=row["collectionName"],
                    parent_id=row["parentCollectionID"],
                    parent_key=None,  # Will be populated if needed
                )
            )

        return collections

    def get_tags(self) -> list[Tag]:
        """Get all tags with item count."""
        conn = self._ensure_connected()
        cursor = conn.cursor()

        sql = """
            SELECT
                t.tagID,
                t.name,
                COUNT(it.itemID) as count
            FROM tags t
            LEFT JOIN itemTags it ON t.tagID = it.tagID
            LEFT JOIN items i ON it.itemID = i.itemID
            WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
            GROUP BY t.tagID
            ORDER BY count DESC, t.name
        """

        cursor.execute(sql)
        rows = cursor.fetchall()

        return [Tag(tag_id=row["tagID"], name=row["name"], count=row["count"]) for row in rows]

    def _get_authors(self, cursor: sqlite3.Cursor, item_id: int) -> list[str]:
        """Get authors for an item."""
        sql = """
            SELECT c.firstName, c.lastName
            FROM creators c
            JOIN itemCreators ic ON c.creatorID = ic.creatorID
            JOIN creatorTypes ct ON ic.creatorTypeID = ct.creatorTypeID
            WHERE ic.itemID = ? AND ct.creatorType = 'author'
            ORDER BY ic.orderIndex
        """
        cursor.execute(sql, (item_id,))
        rows = cursor.fetchall()

        authors = []
        for row in rows:
            if row["firstName"] and row["lastName"]:
                authors.append(f"{row['firstName']} {row['lastName']}")
            elif row["lastName"]:
                authors.append(row["lastName"])

        return authors
