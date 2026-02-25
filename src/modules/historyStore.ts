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
  private static instance: HistoryStorage;
  private static readonly JSON_FILENAME = "zoteroofmine_history.json";
  private static readonly JSON_VERSION = 1;
  
  private entriesArray: ReadingHistoryEntry[] = [];
  private entriesMap: Map<string, ReadingHistoryEntry> = new Map();
  private entriesByItemID: Map<number, ReadingHistoryEntry> = new Map();
  private jsonFilePath: string | null = null;

  static getInstance(): HistoryStorage {
    if (!HistoryStorage.instance) {
      HistoryStorage.instance = new HistoryStorage();
    }
    return HistoryStorage.instance;
  }

  private generateId(itemID: number, captureTime: number): string {
    return `${itemID}-${captureTime}`;
  }

  private getJSONFilePath(): string {
    if (!this.jsonFilePath) {
      this.jsonFilePath = PathUtils.join(PathUtils.profileDir, HistoryStorage.JSON_FILENAME);
    }
    return this.jsonFilePath;
  }

  add(entry: NewHistoryEntry): ReadingHistoryEntry {
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

    this.saveToJSON();

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

  clear(): void {
    this.entriesArray = [];
    this.entriesMap.clear();
    this.entriesByItemID.clear();
    this.clearJSONFile();
  }

  getCount(): number {
    return this.entriesArray.length;
  }

  // ========================================
  // JSON Storage Methods
  // ========================================

  private saveToJSON(): void {
    try {
      const filePath = this.getJSONFilePath();
      
      const data: HistoryJSONFile = {
        version: HistoryStorage.JSON_VERSION,
        entries: this.entriesArray.map(e => ({
          itemID: e.item.id,
          captureTime: e.captureTime,
        })),
      };

      IOUtils.writeUTF8(filePath, JSON.stringify(data, null, 2)).catch(e => {
        ztoolkit.log("[HistoryStorage] Save failed:", e);
      });
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Save failed:", e);
    }
  }

  async loadFromJSON(): Promise<void> {
    try {
      const filePath = this.getJSONFilePath();
      
      if (!(await IOUtils.exists(filePath))) {
        return;
      }

      const jsonString = await IOUtils.readUTF8(filePath);
      const data: HistoryJSONFile = JSON.parse(jsonString as string);

      if (!data.entries || !Array.isArray(data.entries)) {
        return;
      }

      this.entriesArray = [];
      this.entriesMap.clear();
      this.entriesByItemID.clear();

      for (const { itemID, captureTime } of data.entries) {
        const item = ZDB.getItemById(itemID);
        if (!item) continue;

        const itemInfo: ItemInfo = {
          id: item.id,
          title: ZDB.getItemTitle(item),
          authors: ZDB.getItemAuthors(item),
          year: ZDB.getItemYear(item),
          publication: ZDB.getItemPublication(item),
          doi: ZDB.getItemDOI(item),
          abstract: ZDB.getItemAbstract(item),
        };

        const id = this.generateId(itemID, captureTime);
        const entry: ReadingHistoryEntry = { id, captureTime, item: itemInfo };

        this.entriesArray.push(entry);
        this.entriesMap.set(id, entry);
        this.entriesByItemID.set(itemID, entry);
      }

      this.entriesArray.sort((a, b) => b.captureTime - a.captureTime);
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Load failed:", e);
    }
  }

  async ensureLoaded(): Promise<void> {
    await this.loadFromJSON();
  }

  private clearJSONFile(): void {
    try {
      const filePath = this.getJSONFilePath();
      const data: HistoryJSONFile = {
        version: HistoryStorage.JSON_VERSION,
        entries: [],
      };
      IOUtils.writeUTF8(filePath, JSON.stringify(data, null, 2)).catch(e => {
        ztoolkit.log("[HistoryStorage] Clear failed:", e);
      });
    } catch (e) {
      ztoolkit.log("[HistoryStorage] Clear failed:", e);
    }
  }
}
