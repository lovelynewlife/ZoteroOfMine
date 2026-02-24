/**
 * Reading History Module
 * Display reading history using a button at the bottom
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ZDB } from "../utils/zdb";
import { HistoryStorage } from "./historyStore";

const READING_HISTORY_TAG = "_zoteroofmine_reading_history";

export class ReadingHistoryFactory {
  private static notifierID: string | null = null;
  private static lastCaptureTime: Map<string, number> = new Map();
  private static readonly CAPTURE_COOLDOWN_MS = 10000; // 10 seconds
  private static historyRowId = `${config.addonRef}-history-row`;
  private static historyRowElement: HTMLElement | null = null;

  /**
   * Register reading history functionality
   */
  static async register() {
    this.registerNotifier();
    this.insertHistoryRow();
    ztoolkit.log("[ReadingHistory] Reading history module registered");
  }

  /**
   * Insert history row at bottom of left pane
   */
  private static insertHistoryRow() {
    ztoolkit.log("[ReadingHistory] Inserting history row...");
    
    try {
      const historyRow = this.createHistoryRow(document);
      this.findAndInsert(historyRow, document);
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Error inserting history row:", e);
    }
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
   * Handle history row click
   */
  private static onHistoryRowClick() {
    this.showHistoryDialog();
  }

  /**
   * Show history dialog
   */
  static showHistoryDialog() {
    ztoolkit.log("[ReadingHistory] Opening history dialog...");
    
    const historyStorage = HistoryStorage.getInstance();
    const entries = historyStorage.getAll();
    
    ztoolkit.log("[ReadingHistory] Total entries:", entries.length);

    const dialogData: {
      entries: Array<{
        title: string;
        authors: string;
        captureTime: string;
        itemID: number;
      }>;
      loadLock: any;
    } = {
      entries: entries.map(entry => ({
        title: entry.item.title,
        authors: entry.item.authors,
        captureTime: new Date(entry.captureTime).toLocaleString(),
        itemID: entry.item.id,
      })),
      loadLock: Zotero.Promise.defer(),
    };

    // Create a simple dialog to show history
    const dialog = new ztoolkit.Dialog(10, 10)
      .setDialogData(dialogData)
      .addCell(0, 0, {
        tag: "h1",
        styles: {
          marginTop: "0",
        },
        properties: {
          innerText: `${getString("history-count")}: ${entries.length}`,
        },
      })
      .addCell(1, 0, {
        tag: "div",
        id: `${config.addonRef}-history-container`,
        styles: {
          maxHeight: "400px",
          overflow: "auto",
          border: "1px solid #ccc",
          padding: "10px",
        },
      })
      .addButton("Close", "close-button")
      .open(getString("reading-history-label"), {
        centerscreen: true,
        resizable: true,
        fitContent: true,
      });

    // Wait for dialog to load, then render entries
    dialogData.loadLock.promise.then(() => {
      ztoolkit.log("[ReadingHistory] Dialog loaded, rendering entries...");
      const container = dialog.window.document.getElementById(`${config.addonRef}-history-container`);
      if (!container) return;

      if (entries.length === 0) {
        const emptyDiv = dialog.window.document.createElement("div");
        emptyDiv.style.padding = "20px";
        emptyDiv.style.textAlign = "center";
        emptyDiv.style.color = "#666";
        emptyDiv.innerText = getString("no-history-yet");
        container.appendChild(emptyDiv);
        return;
      }

      dialogData.entries.forEach((entry, index) => {
        const entryDiv = dialog.window.document.createElement("div");
        entryDiv.style.padding = "8px";
        entryDiv.style.borderBottom = "1px solid #eee";
        entryDiv.style.cursor = "pointer";
        entryDiv.onclick = () => {
          this.openItem(entry.itemID, dialog.window);
        };

        const titleDiv = dialog.window.document.createElement("div");
        titleDiv.style.fontSize = "14px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.marginBottom = "4px";
        titleDiv.innerText = entry.title;

        const authorsDiv = dialog.window.document.createElement("div");
        authorsDiv.style.fontSize = "12px";
        authorsDiv.style.color = "#666";
        authorsDiv.style.marginBottom = "2px";
        authorsDiv.innerText = entry.authors;

        const timeDiv = dialog.window.document.createElement("div");
        timeDiv.style.fontSize = "11px";
        timeDiv.style.color = "#999";
        timeDiv.innerText = entry.captureTime;

        entryDiv.appendChild(titleDiv);
        entryDiv.appendChild(authorsDiv);
        entryDiv.appendChild(timeDiv);
        container.appendChild(entryDiv);
      });

      ztoolkit.log("[ReadingHistory] History entries rendered");
    });
  }

  /**
   * Open item in Zotero
   */
  private static openItem(itemID: number, win: Window) {
    ztoolkit.log("[ReadingHistory] Opening item:", itemID);
    
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane) {
        ztoolkit.log("[ReadingHistory] ERROR: Could not get active Zotero pane");
        return;
      }

      const item = Zotero.Items.get(itemID);
      if (!item) {
        ztoolkit.log("[ReadingHistory] Item not found:", itemID);
        return;
      }

      // Select the item in the library
      pane.selectItem(itemID);

      // If it's an attachment, open it
      if (item.isAttachment()) {
        Zotero.Reader.open(itemID);
      } else {
        // Try to open the PDF attachment
        const attachments = item.getAttachments();
        if (attachments && attachments.length > 0) {
          Zotero.Reader.open(attachments[0]);
        }
      }
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Error opening item:", e);
    }
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
    window.setTimeout(() => {
      try {
        ztoolkit.log("[ReadingHistory] Capturing history for tab:", tabID);
        
        // Get the reader by tab ID
        const reader = Zotero.Reader.getByTabID(tabID);
        if (!reader || !reader.itemID) {
          ztoolkit.log("[ReadingHistory] Reader not found or invalid");
          return;
        }

        ztoolkit.log("[ReadingHistory] Reader itemID:", reader.itemID);

        // Get complete item info using ZDB
        const itemInfo = ZDB.getItemInfoByAttachmentID(reader.itemID);
        if (!itemInfo) {
          ztoolkit.log("[ReadingHistory] Item info not found");
          return;
        }

        ztoolkit.log("[ReadingHistory] Item info:", itemInfo.title);

        // Store in history storage (using composition pattern)
        const historyStorage = HistoryStorage.getInstance();
        const entry = historyStorage.add({
          item: itemInfo,
        });
        
        ztoolkit.log("[ReadingHistory] History entry added, ID:", entry.id);
        ztoolkit.log("[ReadingHistory] Total entries:", historyStorage.getCount());

        // Show notification
        this.showCaptureDialog(itemInfo.title, itemInfo.authors);
      } catch (e) {
        ztoolkit.log("[ReadingHistory] Error capturing history", e);
      }
    }, 0);
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
    // Remove history row if exists
    if (this.historyRowElement) {
      this.historyRowElement.remove();
      this.historyRowElement = null;
    }
    
    this.unregisterNotifier();
    this.lastCaptureTime.clear();
  }
}
