/**
 * CCP (Clipboard Context Protocol) Producer Module
 * Provides "Copy as AI Context" functionality for Zotero items
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ZDB } from "../utils/zdb";

/**
 * CCP item data structure
 */
interface CCPItem {
  key: string;
  title: string;
  authors: string[];
  year: string;
  doi?: string;
  url?: string;
}

/**
 * CCP single item structure
 */
interface CCPContextSingle {
  ccp: "1.0";
  source: "zotero";
  item: CCPItem;
  hint: string;
}

/**
 * CCP multiple items structure
 */
interface CCPContextMultiple {
  ccp: "1.0";
  source: "zotero";
  items: CCPItem[];
  hint: string;
}

type CCPContext = CCPContextSingle | CCPContextMultiple;

/**
 * CCP Producer Factory
 * Handles copying Zotero items as AI context
 */
export class CCPProducerFactory {
  private static readonly CCP_HINT = 
    "You can use zcli commands (e.g., zcli get KEY, zcli search) to get more information. " +
    "Feel free to handle this context in your own way if zcli is not available.";

  private static menuItemId = `${config.addonRef}-ccp-copy`;

  /**
   * Register the right-click menu item
   */
  static register(): void {
    ztoolkit.log("[CCP] Registering CCP context menu item");

    const menuIcon = `chrome://${config.addonRef}/content/icons/ai-talk.svg`;

    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: this.menuItemId,
      label: getString("ccp-copy-as-context"),
      commandListener: () => this.onCopyContext(),
      icon: menuIcon,
    });

    ztoolkit.log("[CCP] Context menu item registered");
  }

  /**
   * Unregister the menu item
   */
  static unregister(): void {
    // Menu items are automatically cleaned up by ztoolkit
  }

  /**
   * Handle copy context command
   */
  private static async onCopyContext(): Promise<void> {
    try {
      const items = this.getSelectedItems();
      
      if (items.length === 0) {
        this.showNotification(getString("ccp-no-selection"), "warning");
        return;
      }

      const ccp = this.buildCCP(items);
      const jsonStr = JSON.stringify(ccp, null, 2);
      
      await this.copyToClipboard(jsonStr);
      
      this.showNotification(
        items.length === 1 
          ? getString("ccp-copy-success")
          : getString("ccp-copy-success-multiple", { args: { count: items.length } }),
        "success"
      );
      
      ztoolkit.log("[CCP] Copied", items.length, "item(s) to clipboard");
    } catch (e) {
      ztoolkit.log("[CCP] Error copying context:", e);
      this.showNotification(getString("ccp-copy-error"), "fail");
    }
  }

  /**
   * Get currently selected items in Zotero
   */
  private static getSelectedItems(): Zotero.Item[] {
    const pane = Zotero.getActiveZoteroPane();
    if (!pane) return [];
    
    const items = pane.getSelectedItems();
    // Filter to only regular items (not attachments, notes, etc.)
    return items.filter(item => item.isRegularItem());
  }

  /**
   * Build CCP structure from items
   */
  private static buildCCP(items: Zotero.Item[]): CCPContext {
    const ccpItems = items.map(item => this.buildCCPItem(item));

    if (ccpItems.length === 1) {
      return {
        ccp: "1.0",
        source: "zotero",
        item: ccpItems[0],
        hint: this.CCP_HINT.replace("KEY", ccpItems[0].key),
      };
    }

    return {
      ccp: "1.0",
      source: "zotero",
      items: ccpItems,
      hint: this.CCP_HINT,
    };
  }

  /**
   * Build single CCP item from Zotero item
   */
  private static buildCCPItem(item: Zotero.Item): CCPItem {
    const ccpItem: CCPItem = {
      key: item.key,
      title: ZDB.getItemTitle(item),
      authors: this.parseAuthors(ZDB.getItemAuthors(item)),
      year: ZDB.getItemYear(item),
    };

    // Add optional fields
    const doi = ZDB.getItemDOI(item);
    if (doi) ccpItem.doi = doi;

    const url = ZDB.getItemURL(item);
    if (url) ccpItem.url = url;

    return ccpItem;
  }

  /**
   * Parse authors string into array
   * Input: "Author One, Author Two, Author Three"
   * Output: ["Author One", "Author Two", "Author Three"]
   */
  private static parseAuthors(authorsStr: string): string[] {
    if (!authorsStr) return [];
    return authorsStr.split(", ").filter(a => a.trim());
  }

  /**
   * Copy text to clipboard
   */
  private static async copyToClipboard(text: string): Promise<void> {
    await Zotero.Utilities.Internal.copyTextToClipboard(text);
  }

  /**
   * Show notification popup
   */
  private static showNotification(text: string, type: "success" | "warning" | "fail" = "success"): void {
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text,
        type,
        progress: 100,
      })
      .show();
  }
}
