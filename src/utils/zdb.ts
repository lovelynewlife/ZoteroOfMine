/**
 * Zotero Database Utility Module
 * Provides unified API for item data retrieval and manipulation
 */

import { getString } from "./locale";

/**
 * Item information interface
 */
export interface ItemInfo {
  id: number;
  title: string;
  authors: string;
  year: string;
  publication: string;
  doi: string;
  abstract: string;
}

/**
 * Zotero Database Utility Class
 * Encapsulates common data retrieval operations
 */
export class ZDB {
  private static readonly UNKNOWN = "capture-history-no-authors";

  /**
   * Get item by ID
   */
  static getItemById(itemID: number): Zotero.Item | null {
    if (!itemID) return null;
    const item = Zotero.Items.get(itemID);
    return item || null;
  }

  /**
   * Get parent item from attachment
   */
  static getParentItem(attachment: Zotero.Item): Zotero.Item | null {
    if (!attachment) return null;
    const parentItemID = (attachment as any).parentItemID || (attachment as any).parentID;
    if (!parentItemID) return null;
    return this.getItemById(parentItemID);
  }

  /**
   * Get item title
   */
  static getItemTitle(item: Zotero.Item): string {
    if (!item) return "";
    return (item.getField("title") as string) || "";
  }

  /**
   * Get item authors
   */
  static getItemAuthors(item: Zotero.Item): string {
    if (!item) return getString(this.UNKNOWN);

    try {
      // Method 1: Get all creators
      const creators = item.getCreators();
      if (creators && creators.length > 0) {
        const authorNames = creators
          .map((c: any) => {
            if (c.name) return c.name;
            if (c.firstName && c.lastName) {
              return `${c.firstName} ${c.lastName}`.trim();
            }
            if (c.lastName) return c.lastName;
            return "";
          })
          .filter((name: string) => name);

        if (authorNames.length > 0) {
          return authorNames.join(", ");
        }
      }

      // Method 2: Try firstCreator field
      const firstCreator = item.getField("firstCreator");
      if (firstCreator) return firstCreator as string;

      return getString(this.UNKNOWN);
    } catch (e) {
      return getString(this.UNKNOWN);
    }
  }

  /**
   * Get item publication year
   */
  static getItemYear(item: Zotero.Item): string {
    if (!item) return "";
    const date = item.getField("date") as string;
    if (!date) return "";
    
    // Extract year from date string
    const yearMatch = date.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : "";
  }

  /**
   * Get item publication/journal name
   */
  static getItemPublication(item: Zotero.Item): string {
    if (!item) return "";
    return (item.getField("publicationTitle") as string) || 
           (item.getField("journalAbbreviation") as string) || "";
  }

  /**
   * Get item DOI
   */
  static getItemDOI(item: Zotero.Item): string {
    if (!item) return "";
    return (item.getField("DOI") as string) || "";
  }

  /**
   * Get item abstract
   */
  static getItemAbstract(item: Zotero.Item): string {
    if (!item) return "";
    return (item.getField("abstractNote") as string) || "";
  }

  /**
   * Get item URL
   */
  static getItemURL(item: Zotero.Item): string {
    if (!item) return "";
    return (item.getField("url") as string) || "";
  }

  /**
   * Get item tags
   */
  static getItemTags(item: Zotero.Item): string[] {
    if (!item) return [];
    const tags = item.getTags();
    return tags.map((t: any) => (typeof t === "string" ? t : t.tag || ""));
  }

  /**
   * Get item collections
   */
  static getItemCollections(item: Zotero.Item): number[] {
    if (!item) return [];
    return item.getCollections() || [];
  }

  /**
   * Get PDF file path for an item
   * Returns empty string if no PDF attachment exists
   */
  static getItemPDFPath(item: Zotero.Item): string {
    if (!item) return "";

    try {
      // Get all attachments of the item
      const attachmentIDs = item.getAttachments();
      if (!attachmentIDs || attachmentIDs.length === 0) {
        return "";
      }

      // Find PDF attachment
      for (const attachmentID of attachmentIDs) {
        const attachment = this.getItemById(attachmentID);
        if (!attachment) continue;

        // Check if it's a PDF attachment
        const contentType = attachment.attachmentContentType;
        const path = attachment.getFilePath?.();
        
        // Check by content type or file extension
        if (contentType === "application/pdf" || 
            (path && path.toLowerCase().endsWith(".pdf"))) {
          return path || "";
        }
      }

      return "";
    } catch (e) {
      return "";
    }
  }

  /**
   * Check if item has PDF attachment
   */
  static hasPDFAttachment(item: Zotero.Item): boolean {
    return this.getItemPDFPath(item) !== "";
  }

  /**
   * Get complete item info by attachment ID
   * This is the main method for retrieving item information from a PDF attachment
   */
  static getItemInfoByAttachmentID(attachmentID: number): ItemInfo | null {
    const attachment = this.getItemById(attachmentID);
    if (!attachment) return null;

    // Get parent item (the actual literature entry)
    const parentItem = this.getParentItem(attachment);
    const targetItem = parentItem || attachment;

    return {
      id: targetItem.id,
      title: this.getItemTitle(targetItem),
      authors: this.getItemAuthors(targetItem),
      year: this.getItemYear(targetItem),
      publication: this.getItemPublication(targetItem),
      doi: this.getItemDOI(targetItem),
      abstract: this.getItemAbstract(targetItem),
    };
  }

  /**
   * Get basic item info (title + authors) by attachment ID
   * Simplified version for quick retrieval
   */
  static getBasicItemInfoByAttachmentID(attachmentID: number): { title: string; authors: string } | null {
    const attachment = this.getItemById(attachmentID);
    if (!attachment) return null;

    const parentItem = this.getParentItem(attachment);
    const targetItem = parentItem || attachment;

    return {
      title: this.getItemTitle(targetItem),
      authors: this.getItemAuthors(targetItem),
    };
  }
}
