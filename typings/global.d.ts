declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  window: Window;
  document: Document;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

declare class Localization {}

// Extend Zotero.Promise with delay method (Bluebird feature)
declare namespace Zotero {
  interface Promise<T = void> extends _ZoteroTypes.Bluebird<T> {
    delay(ms: number): _ZoteroTypes.Bluebird<T>;
  }

  // Extend Zotero with Reader
  interface Reader {
    getByTabID(tabID: string): { itemID: number } | null;
    open(itemID: number): Promise<void>;
  }
}
