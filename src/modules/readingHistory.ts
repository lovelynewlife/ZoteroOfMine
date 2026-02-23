/**
 * Reading History Module
 * Add a fixed item in the left sidebar for storing reading history of papers
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";

export class ReadingHistoryFactory {
  private static historyRowId = `${config.addonRef}-reading-history-row`;
  private static historyRowElement: HTMLElement | null = null;
  private static notifierID: string | null = null;
  private static lastCaptureTime: Map<string, number> = new Map();
  private static readonly CAPTURE_COOLDOWN_MS = 10000; // 10 seconds

  /**
   * Register reading history item to the left sidebar
   */
  static register() {
    this.waitForUI();
    this.registerNotifier();
  }

  /**
   * Register notifier to capture PDF open events
   */
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<string | number>,
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          return;
        }
        this.onNotify(event, type, ids, extraData);
      },
    };

    this.notifierID = Zotero.Notifier.registerObserver(callback, ["tab"]);

    window.addEventListener("unload", () => {
      this.unregisterNotifier();
    }, false);
  }

  /**
   * Handle notify events
   */
  private static onNotify(
    event: string,
    type: string,
    ids: Array<string | number>,
    extraData: { [key: string]: any },
  ) {
    // Handle both tab add and select events
    if (type !== "tab" || (event !== "add" && event !== "select")) {
      return;
    }

    // Check if it's a reader tab
    const tabID = ids[0] as string;
    const tabData = extraData[tabID];
    
    if (!tabData || tabData.type !== "reader") {
      return;
    }

    // Check cooldown
    if (!this.shouldCapture(tabID)) {
      return;
    }

    this.captureReadingHistory(tabID);
  }

  /**
   * Check if we should capture based on cooldown
   */
  private static shouldCapture(tabID: string): boolean {
    const now = Date.now();
    const lastTime = this.lastCaptureTime.get(tabID);
    
    if (lastTime && (now - lastTime) < this.CAPTURE_COOLDOWN_MS) {
      return false;
    }
    
    this.lastCaptureTime.set(tabID, now);
    return true;
  }

  /**
   * Capture reading history when PDF is opened
   */
  private static captureReadingHistory(tabID: string) {
    // Use setTimeout to defer dialog to next event loop
    // This prevents blocking PDF initialization
    window.setTimeout(async () => {
      try {
        // Get the reader by tab ID
        const reader = Zotero.Reader.getByTabID(tabID);
        if (!reader) {
          return;
        }

        // Get the item (PDF attachment)
        const itemID = reader.itemID;
        if (!itemID) {
          return;
        }
        const attachment = Zotero.Items.get(itemID);
        if (!attachment) {
          return;
        }

        // Get the parent item (the actual literature entry)
        const parentItemID = attachment.parentItemID || (attachment as any).parentID;
        let parentItem: any = null;
        
        if (parentItemID) {
          parentItem = Zotero.Items.get(parentItemID);
        }

        let title: string;
        let authors: string;

        if (!parentItem) {
          // If no parent, use the attachment itself
          title = attachment.getField("title") as string;
          authors = getString("capture-history-no-authors");
        } else {
          // Extract title from parent item
          title = parentItem.getField("title") as string;
          
          // Get authors - try multiple approaches
          authors = this.getAuthorsFromItem(parentItem);
        }

        // Show modal dialog
        this.showCaptureDialog(title, authors);
      } catch (e) {
        ztoolkit.log("ReadingHistoryFactory: Error capturing history", e);
      }
    }, 0);
  }

  /**
   * Get authors string from item
   */
  private static getAuthorsFromItem(item: any): string {
    try {
      // Method 1: Get all creators
      const creators = item.getCreators();
      if (creators && creators.length > 0) {
        const authorNames = creators.map((c: any) => {
          // Handle both name formats
          if (c.name) {
            return c.name;  // Single name field
          } else if (c.firstName && c.lastName) {
            return `${c.firstName} ${c.lastName}`.trim();
          } else if (c.lastName) {
            return c.lastName;
          }
          return "";
        }).filter((name: string) => name);
        
        if (authorNames.length > 0) {
          return authorNames.join(", ");
        }
      }

      // Method 2: Try firstCreator field
      const firstCreator = item.getField("firstCreator");
      if (firstCreator) {
        return firstCreator as string;
      }

      return getString("capture-history-no-authors");
    } catch (e) {
      ztoolkit.log("ReadingHistoryFactory: Error getting authors", e);
      return getString("capture-history-no-authors");
    }
  }

  /**
   * Show capture history dialog (non-blocking ProgressWindow)
   */
  private static showCaptureDialog(title: string, authors: string) {
    new ztoolkit.ProgressWindow(getString("capture-history-title"), {
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        text: `${getString("capture-history-title-label")} ${title}`,
        type: "default",
        progress: 100,
      })
      .createLine({
        text: `${getString("capture-history-authors-label")} ${authors}`,
        type: "default",
        progress: 100,
      })
      .show();
  }

  /**
   * Wait for UI to be fully loaded
   */
  private static async waitForUI() {
    await Zotero.Promise.delay(200);
    this.insertHistoryRow();
  }

  /**
   * Insert history row into the sidebar
   */
  private static insertHistoryRow() {
    const doc = document;
    
    // Skip if already exists
    if (doc.getElementById(this.historyRowId)) {
      return;
    }

    const historyRow = this.createHistoryRow(doc);
    this.findAndInsert(historyRow, doc);
  }

  /**
   * Create the history row element
   */
  private static createHistoryRow(doc: Document): HTMLElement {
    return ztoolkit.UI.createElement(doc, "div", {
      id: this.historyRowId,
      namespace: "html",
      classList: ["reading-history-row"],
      styles: {
        display: "flex",
        alignItems: "center",
        padding: "8px 8px 8px 16px",
        cursor: "pointer",
        backgroundColor: "var(--material-background)",
        borderTop: "1px solid var(--fill-quinary)",
        minHeight: "28px",
        flexShrink: "0",
        position: "sticky",
        bottom: "0",
        zIndex: "10",
      },
      listeners: [
        {
          type: "click",
          listener: (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.onHistoryRowClick();
          },
        },
        {
          type: "mouseenter",
          listener: (e: Event) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--fill-quinary)";
          },
        },
        {
          type: "mouseleave",
          listener: (e: Event) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
          },
        },
      ],
      children: [
        {
          tag: "span",
          namespace: "html",
          styles: {
            marginRight: "8px",
            fontSize: "16px",
            lineHeight: "1",
          },
          properties: {
            innerText: "📖",
          },
        },
        {
          tag: "span",
          namespace: "html",
          styles: {
            fontSize: "inherit",
            fontWeight: "400",
            userSelect: "none",
            color: "var(--fill-primary)",
          },
          properties: {
            innerText: getString("reading-history-label"),
          },
        },
      ],
    }) as HTMLElement;
  }

  /**
   * Find the correct container and insert the history row
   */
  private static findAndInsert(historyRow: HTMLElement, doc: Document) {
    // Find the collection tree's virtualized list
    const windowedList = doc.querySelector(".windowed-list") as HTMLElement;
    
    if (windowedList) {
      // Traverse up to find a flex column container
      let target: HTMLElement | null = windowedList;
      
      while (target) {
        const style = doc.defaultView?.getComputedStyle(target);
        const isScrollable = style?.overflow === "auto" || style?.overflow === "scroll" || 
                            style?.overflowY === "auto" || style?.overflowY === "scroll";
        const isFlexColumn = style?.display === "flex" && 
                            (style?.flexDirection === "column" || !style?.flexDirection);
        
        if (isScrollable || isFlexColumn || target.id === "zotero-collections-pane") {
          // Found suitable container, append to its parent
          if (target.parentElement) {
            target.parentElement.appendChild(historyRow);
            this.historyRowElement = historyRow;
            return;
          }
        }
        
        target = target.parentElement;
      }
    }
    
    // Fallback: insert after #zotero-collections-pane
    const collectionsPane = doc.querySelector("#zotero-collections-pane") as HTMLElement;
    if (collectionsPane?.parentElement) {
      collectionsPane.insertAdjacentElement("afterend", historyRow);
      this.historyRowElement = historyRow;
    }
  }

  /**
   * Click handler
   */
  private static onHistoryRowClick() {
    new ztoolkit.ProgressWindow(getString("reading-history-label"), {
      closeOnClick: true,
      closeTime: 3000,
    })
      .createLine({
        text: "Hello World!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  /**
   * Unregister notifier
   */
  private static unregisterNotifier() {
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = null;
    }
  }

  /**
   * Unregister all
   */
  static unregister() {
    document.getElementById(this.historyRowId)?.remove();
    
    try {
      Zotero.getMainWindow()?.document.getElementById(this.historyRowId)?.remove();
    } catch {
      // Ignore
    }
    
    this.unregisterNotifier();
    this.historyRowElement = null;
    this.lastCaptureTime.clear();
  }
}
