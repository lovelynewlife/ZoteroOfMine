/**
 * History Storage Module
 * Manage reading history entries with in-memory storage and persistence stubs
 */

import { ItemInfo } from "../utils/zdb";

/**
 * Reading history entry
 * Uses composition pattern - contains complete ItemInfo
 * Note: Will be flattened during serialization for persistence
 */
export interface ReadingHistoryEntry {
  id: string;           // Unique identifier for this history entry
  captureTime: number;  // Capture timestamp
  item: ItemInfo;       // Complete item information
}

/**
 * Input type for adding new entry
 */
export type NewHistoryEntry = Omit<ReadingHistoryEntry, 'id' | 'captureTime'>;

export class HistoryStorage {
  private static instance: HistoryStorage;
  
  // In-memory storage: array for ordered access, map for quick lookup
  private entriesArray: ReadingHistoryEntry[] = [];
  private entriesMap: Map<string, ReadingHistoryEntry> = new Map();

  /**
   * Get singleton instance
   */
  static getInstance(): HistoryStorage {
    if (!HistoryStorage.instance) {
      HistoryStorage.instance = new HistoryStorage();
    }
    return HistoryStorage.instance;
  }

  /**
   * Generate unique ID for entry
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a new entry to storage
   */
  add(entry: NewHistoryEntry): ReadingHistoryEntry {
    const newEntry: ReadingHistoryEntry = {
      ...entry,
      id: this.generateId(),
      captureTime: Date.now(),
    };

    // Add to both array and map
    this.entriesArray.unshift(newEntry);  // Add to beginning for newest first
    this.entriesMap.set(newEntry.id, newEntry);

    // TODO: Persist to storage (stub)
    this.save();

    return newEntry;
  }

  /**
   * Get all entries, sorted by capture time (newest first)
   */
  getAll(): ReadingHistoryEntry[] {
    return [...this.entriesArray];
  }

  /**
   * Get entry by ID
   */
  getById(id: string): ReadingHistoryEntry | undefined {
    return this.entriesMap.get(id);
  }

  /**
   * Get entries by item ID ( Zotero item ID)
   */
  getByItemID(itemID: number): ReadingHistoryEntry[] {
    return this.entriesArray.filter(entry => entry.item.id === itemID);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entriesArray = [];
    this.entriesMap.clear();
    
    // TODO: Clear persistent storage (stub)
    this.save();
  }

  /**
   * Get total number of entries
   */
  getCount(): number {
    return this.entriesArray.length;
  }

  /**
   * Save to persistent storage (STUB - placeholder implementation)
   * TODO: Implement actual persistence (e.g., using Zotero preferences or file storage)
   * Note: Will flatten the nested structure for serialization
   */
  private save(): void {
    // Stub implementation - does nothing for now
    // In future, flatten structure for serialization:
    // { id, captureTime, itemId, title, authors, year, publication, doi, abstract }
    ztoolkit.log('HistoryStorage: save() called (stub)');
  }

  /**
   * Load from persistent storage (STUB - placeholder implementation)
   * TODO: Implement actual loading from persistence
   * Note: Will reconstruct the nested structure from flattened data
   */
  load(): void {
    // Stub implementation - does nothing for now
    ztoolkit.log('HistoryStorage: load() called (stub)');
  }
}
