/**
 * Reading History Module
 * Add a fixed item in the left sidebar for storing reading history of papers
 */

import { config } from "../../package.json";

export class ReadingHistoryFactory {
  private static historyRowId = `${config.addonRef}-reading-history-row`;
  private static historyRowElement: HTMLElement | null = null;

  /**
   * Register reading history item to the left sidebar
   */
  static register() {
    this.waitForUI();
  }

  /**
   * Wait for UI to be fully loaded
   */
  private static async waitForUI() {
    await Zotero.Promise.delay(1000);
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
            innerText: "阅读历史",
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
    new ztoolkit.ProgressWindow("阅读历史", {
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
   * Unregister history row
   */
  static unregister() {
    document.getElementById(this.historyRowId)?.remove();
    
    try {
      Zotero.getMainWindow()?.document.getElementById(this.historyRowId)?.remove();
    } catch {
      // Ignore
    }
    
    this.historyRowElement = null;
  }
}
