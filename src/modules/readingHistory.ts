/**
 * Reading History Module
 * Display reading history using a button at the bottom
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ZDB } from "../utils/zdb";
import { HistoryStorage } from "./historyStore";

export class ReadingHistoryFactory {
  private static notifierID: string | null = null;
  private static lastCaptureTime: Map<string, number> = new Map();
  private static readonly CAPTURE_COOLDOWN_MS = 10000; // 10 seconds
  private static historyRowId = `${config.addonRef}-history-row`;
  private static historyRowElement: HTMLElement | null = null;
  private static tableHelper: any = null;
  private static isHistoryViewActive = false;
  private static currentRows: Array<{ title: string; authors: string; captureTime: string; itemID: string }> = [];

  /**
   * Register reading history functionality
   */
  static async register() {
    this.registerNotifier();
    this.insertHistoryRow();
    this.registerCollectionChangeListener();
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
      }, 100);
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
    if (this.isHistoryViewActive) {
      this.hideHistoryView();
    } else {
      this.showHistoryView();
    }
  }

  /**
   * Show history view with VirtualizedTable
   */
  private static showHistoryView() {
    try {
      const zotero = ztoolkit.getGlobal("Zotero");
      const win = zotero.getMainWindow();
      const doc = win.document;

      const itemsPane = doc.querySelector("#zotero-items-pane") as HTMLElement;
      if (!itemsPane) return;

      const itemsTree = doc.querySelector("#zotero-items-tree") as HTMLElement;
      if (!itemsTree) return;

      // Create or get history container
      let historyContainer = doc.getElementById(
        `${config.addonRef}-history-container`
      ) as HTMLElement;

      if (!historyContainer) {
        historyContainer = ztoolkit.UI.createElement(doc, "div", {
          id: `${config.addonRef}-history-container`,
          namespace: "html",
          styles: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          },
        });
        itemsPane.insertBefore(historyContainer, itemsTree);
      }

      // Hide original items tree, show history container
      itemsTree.style.display = "none";
      historyContainer.style.display = "flex";

      // Get and prepare history data
      const historyStorage = HistoryStorage.getInstance();
      const entries = historyStorage.getAll();
      ztoolkit.log(`[ReadingHistory] Showing ${entries.length} history entries`);

      const columns = [
        {
          dataKey: "title",
          label: getString("column-title"),
          flex: 1,
        },
        {
          dataKey: "authors",
          label: getString("column-authors"),
          flex: 1,
        },
        {
          dataKey: "captureTime",
          label: getString("column-time"),
          width: 150,
          fixedWidth: true,
        },
      ];

      this.currentRows = entries.map((entry) => ({
        title: entry.item.title,
        authors: entry.item.authors,
        captureTime: new Date(entry.captureTime).toLocaleString(),
        itemID: String(entry.item.id),
      }));

      // Create VirtualizedTable
      this.tableHelper = new ztoolkit.VirtualizedTable(win)
        .setContainerId(`${config.addonRef}-history-container`)
        .setProp("id", `${config.addonRef}-history-table`)
        .setProp("columns", columns)
        .setProp("showHeader", true)
        .setProp("multiSelect", false)
        .setProp("staticColumns", false)
        .setProp("getRowCount", () => this.currentRows.length)
        .setProp("getRowData", (index: number) =>
          this.currentRows[index] || { title: "", authors: "", captureTime: "" }
        )
        .setProp("onActivate", (event: any) => {
          try {
            const selectedIndex = this.tableHelper.treeInstance.selection.selected;
            if (selectedIndex >= 0 && selectedIndex < this.currentRows.length) {
              const itemID = parseInt(this.currentRows[selectedIndex].itemID);
              this.openItem(itemID);
            }
          } catch (e) {
            ztoolkit.log("[ReadingHistory] Error activating row:", e);
          }
          return true;
        });

      this.tableHelper.render(0);
      this.isHistoryViewActive = true;
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Failed to show history view:", e);
    }
  }

  /**
   * Hide history view and restore original items tree
   */
  private static hideHistoryView() {
    try {
      const zotero = ztoolkit.getGlobal("Zotero");
      const win = zotero.getMainWindow();
      const doc = win.document;

      const itemsTree = doc.querySelector("#zotero-items-tree") as HTMLElement;
      const historyContainer = doc.getElementById(
        `${config.addonRef}-history-container`
      ) as HTMLElement;

      if (itemsTree) itemsTree.style.display = "";
      if (historyContainer) historyContainer.style.display = "none";

      this.tableHelper = null;
      this.currentRows = [];
      this.isHistoryViewActive = false;
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Failed to hide history view:", e);
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
        if (!addon?.data.alive) return;
        this.onNotify(event, type, ids, extraData);
      },
    };

    this.notifierID = Zotero.Notifier.registerObserver(callback, ["tab"]);
    window.addEventListener("unload", () => this.unregisterNotifier(), false);
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
    if (type !== "tab" || (event !== "add" && event !== "select")) return;

    const tabID = ids[0] as string;
    const tabData = extraData[tabID];

    if (!tabData || tabData.type !== "reader") return;
    if (!this.shouldCapture(tabID)) return;

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
    window.setTimeout(() => {
      try {
        const reader = Zotero.Reader.getByTabID(tabID);
        if (!reader || !reader.itemID) return;

        const itemInfo = ZDB.getItemInfoByAttachmentID(reader.itemID);
        if (!itemInfo) return;

        // Store in history storage
        const historyStorage = HistoryStorage.getInstance();
        historyStorage.add({ item: itemInfo });

        ztoolkit.log(`[ReadingHistory] Captured: ${itemInfo.title}`);

        // Show notification
        this.showCaptureDialog(itemInfo.title, itemInfo.authors);
      } catch (e) {
        ztoolkit.log("[ReadingHistory] Failed to capture history:", e);
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
   * Register collection change listener
   * Automatically hide history view when user selects a different collection
   * TODO: Implement actual collection change detection
   */
  private static registerCollectionChangeListener() {
    // Stub implementation - collection change detection not yet implemented
    // Future implementation could use Zotero.Notifier with "collection" events
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

    // Hide history view and restore original items tree
    if (this.isHistoryViewActive) {
      this.hideHistoryView();
    }

    this.unregisterNotifier();
    this.lastCaptureTime.clear();
  }
}
