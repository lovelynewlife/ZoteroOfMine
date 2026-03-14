import {
  BasicExampleFactory,
  HelperExampleFactory,
  KeyExampleFactory,
  PromptExampleFactory,
  UIExampleFactory,
} from "./modules/examples";
import { ReadingHistoryFactory } from "./modules/readingHistory";
import { HistoryStorage } from "./modules/historyStore";
import { HistoryPreferenceScript } from "./modules/historyPreferenceScript";
import { VibeResearchFactory } from "./modules/vibeResearch";
import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
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
  HistoryPreferenceScript.registerPrefsPanel();

  // BasicExampleFactory.registerPrefs();
  // BasicExampleFactory.registerNotifier();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // ztoolkit is already created in onStartup after uiReadyPromise
  // addon.data.ztoolkit = createZToolkit();

  /*const popupWin = new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: true,
    closeTime: 5000,
  })
    .createLine({
      text: getString("startup-begin"),
      type: "default",
      progress: 0,
    })
    .show();
    */

  // KeyExampleFactory.registerShortcuts();

  /* await Zotero.Promise.delay(1000);
  popupWin.changeLine({
    progress: 30,
    text: `[30%] ${getString("startup-begin")}`,
  });*/

  // === UI Examples (disabled) ===
  // UIExampleFactory.registerStyleSheet();
  // UIExampleFactory.registerRightClickMenuItem();
  // UIExampleFactory.registerRightClickMenuPopup();
  // UIExampleFactory.registerWindowMenuWithSeparator();
  // await UIExampleFactory.registerExtraColumn();
  // await UIExampleFactory.registerExtraColumnWithCustomCell();
  // await UIExampleFactory.registerCustomItemBoxRow();
  
  // Test Library Tab registration (disabled)
  // ztoolkit.log("Test: Library Tab registration called");
  // UIExampleFactory.registerLibraryTabPanel();
  // ztoolkit.log("Test: Library Tab registration called");
  
  // await UIExampleFactory.registerReaderTabPanel();

  // === Prompt Examples (disabled) ===
  // PromptExampleFactory.registerNormalCommandExample();
  // PromptExampleFactory.registerAnonymousCommandExample();
  // PromptExampleFactory.registerConditionalCommandExample();

  // === Reading History Feature ===
  ReadingHistoryFactory.register();

  // === Vibe Research Feature ===
  VibeResearchFactory.register();

  // Add mock data for testing (only if no real data exists)
  // const storage = HistoryStorage.getInstance();
  // await storage.ensureLoaded();
  // if (storage.getCount() === 0) {
  //   await storage.addMockDataForTesting();
  // }

  /*await Zotero.Promise.delay(1000);

  popupWin.changeLine({
    progress: 100,
    text: `[100%] ${getString("startup-finish")}`,
  });
  popupWin.startCloseTimer(5000);*/

  // addon.hooks.onDialogEvents("dialogExample");
}

async function onMainWindowUnload(win: Window): Promise<void> {
  // Wait for reading history to save before unloading
  await ReadingHistoryFactory.unregister();
  VibeResearchFactory.unregister();
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

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  // if (
  //   event == "select" &&
  //   type == "tab" &&
  //   extraData[ids[0]].type == "reader"
  // ) {
  //   BasicExampleFactory.exampleNotifierCallback();
  // } else {
  //   return;
  // }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
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

function onShortcuts(type: string) {
  // === Key Examples (disabled) ===
  // switch (type) {
  //   case "larger":
  //     KeyExampleFactory.exampleShortcutLargerCallback();
  //     break;
  //   case "smaller":
  //     KeyExampleFactory.exampleShortcutSmallerCallback();
  //     break;
  //   case "confliction":
  //     KeyExampleFactory.exampleShortcutConflictingCallback();
  //     break;
  //   default:
  //     break;
  // }
}

function onDialogEvents(type: string) {
  // === Dialog Examples (disabled) ===
  // switch (type) {
  //   case "dialogExample":
  //     HelperExampleFactory.dialogExample();
  //     break;
  //   case "clipboardExample":
  //     HelperExampleFactory.clipboardExample();
  //     break;
  //   case "filePickerExample":
  //     HelperExampleFactory.filePickerExample();
  //     break;
  //   case "progressWindowExample":
  //     HelperExampleFactory.progressWindowExample();
  //     break;
  //   case "vtableExample":
  //     HelperExampleFactory.vtableExample();
  //     break;
  //   default:
  //     break;
  // }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

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
