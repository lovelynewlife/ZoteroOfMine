/**
 * Vibe Research Module
 * AI-powered research assistant for Zotero papers
 * 
 * Launches an Electron-based chat UI application
 */

import { config } from "../../package.json";

// Subprocess handle type
interface SubprocessHandle {
  pid: number;
  kill: () => Promise<void>;
  wait: () => Promise<number>;
}

/**
 * VibeResearchFactory class
 * Provides a toolbar button that opens a research assistant chat window
 */
export class VibeResearchFactory {
  private static toolbarButtonId = `${config.addonRef}-vibe-research-btn`;
  private static toolbarButtonElement: HTMLElement | null = null;
  private static electronProcess: SubprocessHandle | null = null;
  private static isDevelopment = true; // Set to false when bundled

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
    this.killElectron();
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
            this.launchElectron();
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
   * Get Electron executable path based on platform
   */
  private static getElectronPath(): string | null {
    const platform = Zotero.platform;
    
    // Development mode: show message
    if (this.isDevelopment) {
      return null;
    }

    // Production: get path from bundled Electron app
    // The path structure after bundle:
    // addon/vibe-research/
    //   ├── win/vibe-research.exe
    //   ├── mac/vibe-research.app/Contents/MacOS/Vibe Research
    //   └── linux/vibe-research
    
    const basePath = `${rootURI}vibe-research/`;
    
    switch (platform) {
      case "win": {
        const exePath = `${basePath}win/vibe-research.exe`;
        ztoolkit.log(`[VibeResearch] Windows path: ${exePath}`);
        return exePath;
      }
      case "mac": {
        const appPath = `${basePath}mac/vibe-research.app`;
        const exePath = `${appPath}/Contents/MacOS/Vibe Research`;
        ztoolkit.log(`[VibeResearch] macOS path: ${exePath}`);
        return exePath;
      }
      case "linux": {
        const exePath = `${basePath}linux/vibe-research`;
        ztoolkit.log(`[VibeResearch] Linux path: ${exePath}`);
        return exePath;
      }
      default: {
        ztoolkit.log(`[VibeResearch] Unsupported platform: ${platform}`);
        return null;
      }
    }
  }

  /**
   * Launch Electron application
   */
  private static async launchElectron(): Promise<void> {
    ztoolkit.log("[VibeResearch] Launching Electron application");

    // Check if already running
    if (this.electronProcess) {
      this.showNotification("Vibe Research is already running", "info");
      return;
    }

    // Development mode: show instruction
    if (this.isDevelopment) {
      this.showDevelopmentModeMessage();
      return;
    }

    // Get executable path
    const execPath = this.getElectronPath();
    if (!execPath) {
      this.showNotification("Failed to find Electron application", "error");
      return;
    }

    try {
      // Launch using Subprocess
      const process = await Zotero.Subprocess.call({
        command: execPath,
        arguments: [],
        stderr: "pipe",
      });

      this.electronProcess = process;
      ztoolkit.log(`[VibeResearch] Electron launched with PID: ${process.pid}`);

      // Show notification
      this.showNotification("Vibe Research started", "success");

      // Wait for process to exit
      const exitCode = await process.wait();
      ztoolkit.log(`[VibeResearch] Electron exited with code: ${exitCode}`);
      this.electronProcess = null;

    } catch (e) {
      ztoolkit.log("[VibeResearch] Failed to launch Electron:", e);
      this.showNotification(`Failed to launch: ${e}`, "error");
      this.electronProcess = null;
    }
  }

  /**
   * Kill Electron process
   */
  static async killElectron(): Promise<void> {
    if (!this.electronProcess) {
      return;
    }

    try {
      await this.electronProcess.kill();
      ztoolkit.log("[VibeResearch] Electron process killed");
    } catch (e) {
      ztoolkit.log("[VibeResearch] Failed to kill Electron:", e);
    }
    this.electronProcess = null;
  }

  /**
   * Show notification in Zotero
   */
  private static showNotification(text: string, type: "success" | "error" | "info"): void {
    new ztoolkit.ProgressWindow("Vibe Research")
      .createLine({
        text: text,
        type: type === "error" ? "fail" : "default",
        progress: 100,
      })
      .show(3000);
  }

  /**
   * Show development mode message
   */
  private static showDevelopmentModeMessage(): void {
    new ztoolkit.ProgressWindow("Vibe Research - Development Mode")
      .createLine({
        text: "🚧 Development Mode",
        type: "default",
        progress: 100,
      })
      .createLine({
        text: "Please run Electron separately:",
        type: "default",
      })
      .createLine({
        text: "pnpm dev:ui",
        type: "default",
      })
      .show(5000);
  }
}
