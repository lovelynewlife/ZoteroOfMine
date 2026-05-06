import { ReadingHistoryFactory } from "./modules/readingHistory";
import { HistoryPreferenceScript } from "./modules/historyPreferenceScript";
import { VibeResearchFactory } from "./modules/vibeResearch";
import { CCPProducerFactory, CCPPDFProducerFactory } from "./modules/ccpProducer";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // Create ztoolkit after UI is ready to avoid initialization issues
  // when Zotero starts with PDF reader instead of main window
  addon.data.ztoolkit = createZToolkit();

  initLocale();

  // Register preference panel
  await HistoryPreferenceScript.registerPrefsPanel();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // ztoolkit is already created in onStartup after uiReadyPromise
  // addon.data.ztoolkit = createZToolkit();

  // === Reading History Feature ===
  ReadingHistoryFactory.register();

  // === Vibe Research Feature (Placeholder) ===
  VibeResearchFactory.register();

  // === CCP Producer (Copy as AI Context) ===
  CCPProducerFactory.register(win);

  // === CCP PDF Producer (Copy PDF selection as AI Context) ===
  CCPPDFProducerFactory.register();

  // Add mock data for testing (only if no real data exists)
  // const storage = HistoryStorage.getInstance();
  // await storage.ensureLoaded();
  // if (storage.getCount() === 0) {
  //   await storage.addMockDataForTesting();
  // }
}

async function onMainWindowUnload(win: Window): Promise<void> {
  // Wait for reading history to save before unloading
  await ReadingHistoryFactory.unregister();
  VibeResearchFactory.unregister();
  CCPProducerFactory.unregister(win);
  CCPPDFProducerFactory.unregister();
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  ztoolkit.log("notify", event, type, ids, extraData);
}

/**
 * Preference UI event dispatcher.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      HistoryPreferenceScript.init(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(_type: string) {}

function onDialogEvents(_type: string) {}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
