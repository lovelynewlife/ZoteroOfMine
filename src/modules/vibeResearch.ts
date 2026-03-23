/**
 * Vibe Research Module
 * AI-powered research assistant for Zotero papers
 * 
 * Currently shows a placeholder popup window.
 * Future: Integration with external AI clients via CCP protocol.
 */

import { config } from "../../package.json";

/**
 * VibeResearchFactory class
 * Provides a toolbar button for research assistant features
 */
export class VibeResearchFactory {
  private static toolbarButtonId = `${config.addonRef}-vibe-research-btn`;
  private static toolbarButtonElement: HTMLElement | null = null;

  /**
   * Register the vibe research feature
   */
  static register(): void {
    ztoolkit.log("[VibeResearch] Registering Vibe Research feature");
    this.insertToolbarButton();
  }

  /**
   * Unregister and cleanup
   */
  static unregister(): void {
    this.removeToolbarButton();
    ztoolkit.log("[VibeResearch] Unregistered Vibe Research feature");
  }

  /**
   * Insert toolbar button into Zotero main window
   */
  private static insertToolbarButton(): void {
    try {
      const win = window;
      const doc = win.document;

      if (doc.readyState !== "complete") {
        win.addEventListener("load", () => this.insertToolbarButton(), { once: true });
        return;
      }

      // Wait for Zotero UI to be ready
      setTimeout(() => {
        const button = this.createToolbarButton(doc);
        this.findAndInsert(button, doc);
      }, 1000);
    } catch (e) {
      ztoolkit.log("[VibeResearch] Insert toolbar button failed:", e);
    }
  }

  /**
   * Create the toolbar button element
   */
  private static createToolbarButton(doc: Document): HTMLElement {
    return ztoolkit.UI.createElement(doc, "div", {
      id: this.toolbarButtonId,
      namespace: "html",
      classList: ["vibe-research-toolbar-btn"],
      styles: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        cursor: "pointer",
        borderRadius: "4px",
        marginLeft: "4px",
        marginRight: "4px",
      },
      children: [
        {
          tag: "img",
          namespace: "html",
          styles: {
            width: "20px",
            height: "20px",
          },
          properties: {
            src: `${rootURI}assets/research.svg`,
            alt: "Vibe Research",
          },
        },
      ],
      listeners: [
        {
          type: "click",
          listener: (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.showPopup();
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
    });
  }

  /**
   * Find the toolbar and insert the button
   */
  private static findAndInsert(button: HTMLElement, doc: Document): void {
    let toolbar = doc.getElementById("zotero-toolbar");
    
    if (!toolbar) {
      toolbar = doc.querySelector("#zotero-toolbar-toolbar") as HTMLElement;
    }
    
    if (!toolbar) {
      toolbar = doc.querySelector(".zotero-toolbar") as HTMLElement;
    }

    if (toolbar) {
      toolbar.appendChild(button);
      this.toolbarButtonElement = button;
      ztoolkit.log("[VibeResearch] Toolbar button inserted successfully");
    } else {
      ztoolkit.log("[VibeResearch] Main toolbar not found, trying sidebar fallback");
      this.insertToSidebar(button, doc);
    }
  }

  /**
   * Fallback: insert button to sidebar
   */
  private static insertToSidebar(button: HTMLElement, doc: Document): void {
    const collectionsPane = doc.getElementById("zotero-collections-pane");
    if (collectionsPane) {
      const parent = collectionsPane.parentElement;
      if (parent) {
        button.style.borderTop = "1px solid var(--fill-quinary)";
        button.style.width = "100%";
        button.style.height = "36px";
        button.style.borderRadius = "0";
        button.style.margin = "0";
        parent.appendChild(button);
        this.toolbarButtonElement = button;
        ztoolkit.log("[VibeResearch] Button inserted to sidebar as fallback");
      }
    }
  }

  /**
   * Remove toolbar button
   */
  private static removeToolbarButton(): void {
    if (this.toolbarButtonElement) {
      this.toolbarButtonElement.remove();
      this.toolbarButtonElement = null;
      ztoolkit.log("[VibeResearch] Toolbar button removed");
    }
  }

  /**
   * Show popup window
   * TODO: Future integration with external AI clients via CCP protocol
   */
  private static showPopup(): void {
    ztoolkit.log("[VibeResearch] Show popup");
    
    new ztoolkit.ProgressWindow("Vibe Research")
      .createLine({
        text: "🚧 Coming Soon",
        type: "default",
        progress: 100,
      })
      .createLine({
        text: "Integration with external AI clients",
        type: "default",
      })
      .createLine({
        text: "via CCP Protocol & Zotero CLI",
        type: "default",
      })
      .show(3000);
  }
}
