/**
 * History Storage Module
 * Manage reading history entries with JSON-based persistence
 * 
 * Storage Strategy:
 * - JSON file stores minimal data (itemID + captureTime)
 * - Item details (title, authors, etc.) are fetched from Zotero API on demand
 * - This keeps the storage lightweight and data always up-to-date
 */

import { ItemInfo, ZDB } from "../utils/zdb";
import { generateMockHistoryData, getMockItemIDs } from "../utils/mockHistory";

/**
 * Persistent entry stored in JSON file
 */
export interface PersistentHistoryEntry {
  itemID: number;
  captureTime: number;
}

/**
 * In-memory entry with full item information
 */
export interface ReadingHistoryEntry {
  id: string;
  captureTime: number;
  item: ItemInfo;
}

export type NewHistoryEntry = Omit<ReadingHistoryEntry, 'id' | 'captureTime'>;

interface HistoryJSONFile {
  version: number;
  entries: PersistentHistoryEntry[];
}

export class HistoryStorage {
  // Singleton instance
  private static instance: HistoryStorage;
  
  // File storage configuration
  private static readonly JSON_FILENAME = "zoteroofmine_history.json";
  private static readonly JSON_VERSION = 1;
  
  // In-memory data structures
  private entriesArray: ReadingHistoryEntry[] = [];
  private entriesMap: Map<string, ReadingHistoryEntry> = new Map();
  private entriesByItemID: Map<number, ReadingHistoryEntry> = new Map();
  private jsonFilePath: string | null = null;
  
  // State management
  private isLoaded: boolean = false;
  private saveInProgress: boolean = false;
  private pendingSave: boolean = false;

  // ========================================
  // Singleton Pattern
  // ========================================
  
  static getInstance(): HistoryStorage {
    if (!HistoryStorage.instance) {
      HistoryStorage.instance = new HistoryStorage();
    }
    return HistoryStorage.instance;
  }

  // ========================================
  // Helper Methods
  // ========================================
  
  private generateId(itemID: number, captureTime: number): string {
    return `${itemID}-${captureTime}`;
  }

  private getJSONFilePath(): string {
    if (!this.jsonFilePath) {
      this.jsonFilePath = PathUtils.join(PathUtils.profileDir, HistoryStorage.JSON_FILENAME);
    }
    return this.jsonFilePath;
  }

  // ========================================
  // Public API
  // ========================================
  
  async add(entry: NewHistoryEntry): Promise<ReadingHistoryEntry> {
    // Ensure data is loaded before adding new entry
    if (!this.isLoaded) {
      ztoolkit.log("[HistoryStorage] Data not loaded, loading from file...");
      await this.ensureLoaded();
      this.isLoaded = true;
    }

    const itemID = entry.item.id;
    const captureTime = Date.now();
    const id = this.generateId(itemID, captureTime);

    // Replace existing entry with same itemID
    const existingEntry = this.entriesByItemID.get(itemID);
    if (existingEntry) {
      this.entriesArray = this.entriesArray.filter(e => e.item.id !== itemID);
      this.entriesMap.delete(existingEntry.id);
    }

    const newEntry: ReadingHistoryEntry = { ...entry, id, captureTime };

    this.entriesArray.unshift(newEntry);
    this.entriesMap.set(id, newEntry);
    this.entriesByItemID.set(itemID, newEntry);

    // Trigger save with queue management
    this.queueSave();

    return newEntry;
  }

  getAll(): ReadingHistoryEntry[] {
    return [...this.entriesArray];
  }

  getById(id: string): ReadingHistoryEntry | undefined {
    return this.entriesMap.get(id);
  }

  getByItemID(itemID: number): ReadingHistoryEntry | undefined {
    return this.entriesByItemID.get(itemID);
  }

  getCount(): number {
    return this.entriesArray.length;
  }

  async deleteByItemID(itemID: number): Promise<boolean> {
    const entry = this.entriesByItemID.get(itemID);
    if (!entry) {
      return false;
    }

    this.entriesArray = this.entriesArray.filter(e => e.item.id !== itemID);
    this.entriesMap.delete(entry.id);
    this.entriesByItemID.delete(itemID);

    // Trigger save with queue management
    this.queueSave();
    return true;
  }

  async clear(): Promise<void> {
    this.entriesArray = [];
    this.entriesMap.clear();
    this.entriesByItemID.clear();
    
    // Clear JSON file
    await this.clearJSONFile();
  }

  /**
   * Force save to JSON file
   * Can be called externally to ensure data is persisted
   */
  async forceSave(): Promise<void> {
    // If save is in progress, wait for it
    await this.waitForSave();
    
    // Perform a save
    await this.saveToJSON();
  }

  // ========================================
  // Save Queue Management
  // ========================================
  
  private queueSave(): void {
    if (this.saveInProgress) {
      // Mark that we have a pending save
      this.pendingSave = true;
      ztoolkit.log("[HistoryStorage] Save already in progress, marking as pending");
      return;
    }

    // Start the save process
    this.performSave();
  }

  private async performSave(): Promise<void> {
    this.saveInProgress = true;
    
    try {
      await this.saveToJSON();
      
      // If there's a pending save, do it again
      if (this.pendingSave) {
        ztoolkit.log("[HistoryStorage] Processing pending save");
        this.pendingSave = false;
        await this.saveToJSON();
      }
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Save failed:", e);
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Wait for any ongoing save to complete
   * This should be called before shutdown
   */
  private async waitForSave(): Promise<void> {
    if (this.saveInProgress) {
      ztoolkit.log("[HistoryStorage] Waiting for save to complete...");
      // Give it up to 5 seconds
      const timeout = Date.now() + 5000;
      while (this.saveInProgress && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.saveInProgress) {
        ztoolkit.log("[HistoryStorage] Save still in progress after timeout");
      }
    }
  }

  // ========================================
  // JSON Storage Methods
  // ========================================
  
  private async saveToJSON(): Promise<void> {
    try {
      const filePath = this.getJSONFilePath();
      
      // Read existing file data to merge with memory data
      let fileEntries: PersistentHistoryEntry[] = [];
      try {
        if (await IOUtils.exists(filePath)) {
          const jsonString = await IOUtils.readUTF8(filePath);
          const data: HistoryJSONFile = JSON.parse(jsonString as string);
          if (data.entries && Array.isArray(data.entries)) {
            fileEntries = data.entries;
          }
        }
      } catch (readError) {
        ztoolkit.log("[HistoryStorage] Failed to read existing file, will overwrite:", readError);
      }

      // Merge memory entries with file entries
      // Memory entries are the source of truth - only save what's in memory
      // This ensures deleted items stay deleted
      const mergedMap = new Map<number, PersistentHistoryEntry>();

      // Only add memory entries - memory is the source of truth
      // Deleted items will not be in memory, so they won't be saved
      for (const entry of this.entriesArray) {
        const persistentEntry: PersistentHistoryEntry = {
          itemID: entry.item.id,
          captureTime: entry.captureTime,
        };
        mergedMap.set(entry.item.id, persistentEntry);
      }

      // Convert map to array and sort by captureTime (newest first)
      const mergedEntries = Array.from(mergedMap.values());
      mergedEntries.sort((a, b) => b.captureTime - a.captureTime);

      // Prepare data to write
      const data: HistoryJSONFile = {
        version: HistoryStorage.JSON_VERSION,
        entries: mergedEntries,
      };

      const jsonString = JSON.stringify(data, null, 2);
      await IOUtils.writeUTF8(filePath, jsonString);
      
      ztoolkit.log("[HistoryStorage] Saved", data.entries.length, "entries to file");
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Save failed:", e);
      
      // Try to save a backup to /tmp
      try {
        const backupPath = `/tmp/zoteroofmine_history_backup_${Date.now()}.json`;
        const data: HistoryJSONFile = {
          version: HistoryStorage.JSON_VERSION,
          entries: this.entriesArray.map(e => ({
            itemID: e.item.id,
            captureTime: e.captureTime,
          })),
        };
        await IOUtils.writeUTF8(backupPath, JSON.stringify(data, null, 2));
        ztoolkit.log("[HistoryStorage] Saved backup to:", backupPath);
      } catch (backupError) {
        ztoolkit.log("[HistoryStorage] Backup save also failed:", backupError);
      }
    }
  }

  async loadFromJSON(): Promise<void> {
    try {
      const filePath = this.getJSONFilePath();
      
      if (!(await IOUtils.exists(filePath))) {
        ztoolkit.log("[HistoryStorage] File does not exist, skipping load");
        this.isLoaded = true;
        return;
      }

      // Read file and load to memory
      const jsonString = await IOUtils.readUTF8(filePath);
      const data: HistoryJSONFile = JSON.parse(jsonString as string);

      if (!data.entries || !Array.isArray(data.entries)) {
        ztoolkit.log("[HistoryStorage] Invalid file format, entries is not an array");
        this.isLoaded = true;
        return;
      }

      // Clear memory and load file entries
      this.entriesArray = [];
      this.entriesMap.clear();
      this.entriesByItemID.clear();

      let loadedCount = 0;
      for (const { itemID, captureTime } of data.entries) {
        const item = ZDB.getItemById(itemID);
        if (!item) {
          ztoolkit.log("[HistoryStorage] Item", itemID, "not found, skipping");
          continue;
        }

        const itemInfo: ItemInfo = {
          id: item.id,
          key: item.key,
          title: ZDB.getItemTitle(item),
          authors: ZDB.getItemAuthors(item),
          year: ZDB.getItemYear(item),
          publication: ZDB.getItemPublication(item),
          doi: ZDB.getItemDOI(item),
          url: ZDB.getItemURL(item),
          abstract: ZDB.getItemAbstract(item),
        };

        const id = this.generateId(itemID, captureTime);
        const entry: ReadingHistoryEntry = { id, captureTime, item: itemInfo };

        this.entriesArray.push(entry);
        this.entriesMap.set(id, entry);
        this.entriesByItemID.set(itemID, entry);
        loadedCount++;
      }

      // Sort by captureTime (newest first)
      this.entriesArray.sort((a, b) => b.captureTime - a.captureTime);

      ztoolkit.log("[HistoryStorage] Successfully loaded", loadedCount, "entries");
      this.isLoaded = true;
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Load failed:", e);
      this.isLoaded = true;
    }
  }

  async ensureLoaded(): Promise<void> {
    await this.loadFromJSON();
  }

  private async clearJSONFile(): Promise<void> {
    try {
      const filePath = this.getJSONFilePath();
      const data: HistoryJSONFile = {
        version: HistoryStorage.JSON_VERSION,
        entries: [],
      };
      await IOUtils.writeUTF8(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Clear failed:", e);
    }
  }

  // ========================================
  // Testing Methods
  // ========================================
  
  /**
   * Add mock data for testing purposes
   * Creates entries with different time ranges to test time-based deletion
   */
  async addMockDataForTesting(): Promise<void> {
    const now = Date.now();
    const { entries: mockEntries, timeOffsets } = generateMockHistoryData();

    for (let i = 0; i < mockEntries.length; i++) {
      const entry = mockEntries[i];
      const captureTime = now - timeOffsets[i];
      const id = this.generateId(entry.item.id, captureTime);
      const historyEntry: ReadingHistoryEntry = { ...entry, id, captureTime };

      this.entriesArray.unshift(historyEntry);
      this.entriesMap.set(id, historyEntry);
      this.entriesByItemID.set(entry.item.id, historyEntry);
    }

    // Sort by capture time (newest first)
    this.entriesArray.sort((a, b) => b.captureTime - a.captureTime);

    await this.saveToJSON();

    ztoolkit.log("[HistoryStorage] Added 8 mock entries for testing");
  }

  /**
   * Remove mock data added for testing
   * Removes all entries with mock IDs
   */
  async removeMockData(): Promise<void> {
    const mockItemIDs = getMockItemIDs();
    
    for (const itemID of mockItemIDs) {
      await this.deleteByItemID(itemID);
    }

    ztoolkit.log("[HistoryStorage] Removed mock entries");
  }
}
