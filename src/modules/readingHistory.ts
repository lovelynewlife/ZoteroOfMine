/**
 * Reading History Module
 * Display reading history using a button at the bottom
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ZDB } from "../utils/zdb";
import { HistoryStorage } from "./historyStore";

export class ReadingHistoryFactory {
  private static history_notifierID: string | null = null;
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
    ztoolkit.log("[ReadingHistory] Module registered");
  }

  /**
   * Insert history row at bottom of left pane
   */
  private static insertHistoryRow() {
    try {
      const win = window;
      const doc = win.document;

      // Wait for DOM to be ready
      if (doc.readyState !== "complete") {
        win.addEventListener("load", () => this.insertHistoryRow(), { once: true });
        return;
      }

      // Small delay to ensure Zotero UI is fully rendered
      setTimeout(() => {
        const historyRow = this.createHistoryRow(doc);
        this.findAndInsert(historyRow, doc);
      }, 1000);
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Failed to insert history row:", e);
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
    const windowedList = doc.querySelector(".windowed-list") as HTMLElement;

    if (windowedList) {
      let target: HTMLElement | null = windowedList;

      while (target) {
        const style = doc.defaultView?.getComputedStyle(target);
        const isScrollable = style?.overflow === "auto" || style?.overflow === "scroll" ||
                            style?.overflowY === "auto" || style?.overflowY === "scroll";
        const isFlexColumn = style?.display === "flex" &&
                            (style?.flexDirection === "column" || !style?.flexDirection);

        if (isScrollable || isFlexColumn || target.id === "zotero-collections-pane") {
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
   * Show history in a dialog with VirtualizedTable
   */
  private static async showHistoryDialog() {
    try {
      const historyStorage = HistoryStorage.getInstance();
      const entries = historyStorage.getAll();
      ztoolkit.log(`[ReadingHistory] Showing ${entries.length} history entries in dialog`);

      const dialogData: { [key: string | number]: any } = {
        loadCallback: () => {
          ztoolkit.log("[ReadingHistory] Dialog loaded");
        },
        unloadCallback: () => {
          ztoolkit.log("[ReadingHistory] Dialog closed");
        },
      };

      // Build rows content for the table
      const tableRows = entries.map((entry, index) => ({
        tag: "tr",
        namespace: "html",
        attributes: {
          "data-item-id": String(entry.item.id),
        },
        styles: {
          cursor: "pointer",
        },
        listeners: [
          {
            type: "dblclick",
            listener: (e: Event) => {
              const row = e.currentTarget as HTMLElement;
              const itemID = parseInt(row.getAttribute("data-item-id") || "0");
              dialogHelper.window?.close();
              setTimeout(() => this.openItem(itemID), 100);
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
            tag: "td",
            namespace: "html",
            styles: {
              padding: "4px 8px",
              borderBottom: "1px solid var(--fill-quinary)",
              backgroundColor: "-moz-dialog",
            },
            properties: {
              innerText: entry.item.title,
            },
          },
          {
            tag: "td",
            namespace: "html",
            styles: {
              padding: "4px 8px",
              borderBottom: "1px solid var(--fill-quinary)",
              backgroundColor: "-moz-dialog",
            },
            properties: {
              innerText: entry.item.authors,
            },
          },
          {
            tag: "td",
            namespace: "html",
            styles: {
              padding: "4px 8px",
              borderBottom: "1px solid var(--fill-quinary)",
              whiteSpace: "nowrap",
              backgroundColor: "-moz-dialog",
            },
            properties: {
              innerText: new Date(entry.captureTime).toLocaleString(),
            },
          },
        ],
      }));

      const dialogHelper = new ztoolkit.Dialog(2, 1)
        .setDialogData(dialogData)
        .addCell(0, 0, {
          tag: "div",
          namespace: "html",
          styles: {
            width: "700px",
            height: "400px",
            overflow: "auto",
            border: "1px solid var(--fill-quinary)",
          },
          children: [
            {
              tag: "table",
              namespace: "html",
              styles: {
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0",
                fontSize: "13px",
              },
              children: [
                // Header row
                {
                  tag: "thead",
                  namespace: "html",
                  children: [
                    {
                      tag: "tr",
                      namespace: "html",
                      styles: {
                        position: "sticky",
                        top: "0",
                      },
                      children: [
                        {
                          tag: "th",
                          namespace: "html",
                          styles: {
                            padding: "8px",
                            textAlign: "left",
                            borderBottom: "2px solid var(--fill-tertiary)",
                            fontWeight: "500",
                            backgroundColor: "-moz-dialog",
                          },
                          properties: {
                            innerText: getString("column-title"),
                          },
                        },
                        {
                          tag: "th",
                          namespace: "html",
                          styles: {
                            padding: "8px",
                            textAlign: "left",
                            borderBottom: "2px solid var(--fill-tertiary)",
                            fontWeight: "500",
                            backgroundColor: "-moz-dialog",
                          },
                          properties: {
                            innerText: getString("column-authors"),
                          },
                        },
                        {
                          tag: "th",
                          namespace: "html",
                          styles: {
                            padding: "8px",
                            textAlign: "left",
                            borderBottom: "2px solid var(--fill-tertiary)",
                            fontWeight: "500",
                            backgroundColor: "-moz-dialog",
                          },
                          properties: {
                            innerText: getString("column-time"),
                          },
                        },
                      ],
                    },
                  ],
                },
                // Body rows
                {
                  tag: "tbody",
                  namespace: "html",
                  children: tableRows.length > 0 ? tableRows : [
                    {
                      tag: "tr",
                      namespace: "html",
                      children: [
                        {
                          tag: "td",
                          namespace: "html",
                          attributes: {
                            colspan: "3",
                          },
                          styles: {
                            padding: "20px",
                            textAlign: "center",
                            color: "var(--fill-secondary)",
                          },
                          properties: {
                            innerText: getString("no-history-yet"),
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        })
        .addButton(getString("close-label") || "Close", "close")
        .open(getString("reading-history-label") || "Reading History", {
          width: 750,
          height: 500,
          centerscreen: true,
          resizable: true,
        });

      // Store dialog reference
      addon.data.dialog = dialogHelper;

      // Wait for dialog to close
      await dialogData.unloadLock.promise;
      addon.data.dialog = undefined;

    } catch (e) {
      ztoolkit.log("[ReadingHistory] Failed to show history dialog:", e);
      if (e instanceof Error) {
        ztoolkit.log("[ReadingHistory] Error message:", e.message);
        ztoolkit.log("[ReadingHistory] Error stack:", e.stack);
      }
    }
  }

  /**
   * Open item in Zotero
   */
  private static openItem(itemID: number) {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane) return;

      const item = Zotero.Items.get(itemID);
      if (!item) return;

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
      ztoolkit.log("[ReadingHistory] Failed to open item:", e);
    }
  }

  /**
   * Register all necessary listeners.
   */

  static registerNotifier() {
    this.registerHistoryNotifier();
  }

  /**
   * Register notifier to capture history reading events
   */
  static registerHistoryNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<string | number>,
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) return;
        try {
          this.onHistoryRecording(event, type, ids, extraData);
        } catch (e) {
          ztoolkit.log("[ReadingHistory] Notifier callback failed:", e);
        }
      },
    };

    this.history_notifierID = Zotero.Notifier.registerObserver(callback, ["tab"]);
    window.addEventListener("unload", () => this.unregisterNotifier(), false);
  }

  /**
   * Handle history recording based on notifier events
   */
  private static onHistoryRecording(
    event: string,
    type: string,
    ids: Array<string | number>,
    extraData: { [key: string]: any },
  ) {
    const idList = Array.isArray(ids) ? ids : [];
    ztoolkit.log(`[ReadingHistory] Notifier event: ${event}, type: ${type}, ids: ${idList.join(",")}`);
    if (type !== "tab") return;

    if(event == "load" || event == "select" || event == "add") {
      const rawTabID = idList[0];
      if (rawTabID === undefined || rawTabID === null) return;

      const tabID = String(rawTabID);
      const tabData = extraData?.[tabID] ?? extraData?.[rawTabID as any];

      if (!tabData || tabData.type !== "reader") return;
      if (!this.shouldCapture(tabID)) return;

      this.captureReadingHistory(tabID);
    }
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
   * @param tabID - The tab ID to capture
   * @param showNotification - Whether to show the notification dialog (default: true)
   * @param setCooldown - Whether to set cooldown time (default: true)
   */
  private static captureReadingHistory(
    tabID: string, 
    showNotification: boolean = true,
    setCooldown: boolean = true
  ) {
    try {
      const reader = Zotero.Reader.getByTabID(tabID);
      if (!reader || !reader.itemID) return;

      const itemInfo = ZDB.getItemInfoByAttachmentID(reader.itemID);
      if (!itemInfo) return;

      // Store in history storage
      const historyStorage = HistoryStorage.getInstance();
      historyStorage.add({ item: itemInfo });

      // Set cooldown time to prevent duplicate captures
      if (setCooldown) {
        this.lastCaptureTime.set(tabID, Date.now());
      }

      ztoolkit.log(`[ReadingHistory] Captured: ${itemInfo.title}`);

      // Show notification only if requested
      if (showNotification) {
        this.showCaptureDialog(itemInfo.title, itemInfo.authors);
      }
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Failed to capture history:", e);
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
   * Unregister notifier
   */
  private static unregisterNotifier() {
    if (this.history_notifierID) {
      Zotero.Notifier.unregisterObserver(this.history_notifierID);
      this.history_notifierID = null;
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

    // Close dialog if open
    if (addon.data.dialog) {
      addon.data.dialog.window?.close();
      addon.data.dialog = undefined;
    }

    this.unregisterNotifier();
    this.lastCaptureTime.clear();
  }
}
