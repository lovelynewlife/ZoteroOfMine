/**
 * History Preference Script Module
 * Handle preference panel UI interactions
 */

import { config } from "../../package.json";
import { HistoryPreferences, CooldownConstraints } from "./historyPreferences";

/**
 * HistoryPreferenceScript class
 * Manages the preference panel UI for reading history settings
 */
export class HistoryPreferenceScript {
  private static window: Window | null = null;
  private static paneID: string | null = null;

  /**
   * Register preference panel
   * Called during plugin startup
   */
  static async registerPrefsPanel(): Promise<void> {
    if (this.paneID) {
      return;
    }

    try {
      const prefOptions = {
        pluginID: config.addonID,
        src: rootURI + "chrome/content/preferences.xhtml",
        id: `zotero-prefpane-${config.addonRef}`,
        label: "ZoteroOfMine",
        image: `chrome://${config.addonRef}/content/icons/favicon.png`,
      };

      this.paneID = await Zotero.PreferencePanes.register(prefOptions);
      ztoolkit.log(`[HistoryPreferenceScript] Preference panel registered: ${this.paneID}`);
    } catch (error) {
      ztoolkit.log("[HistoryPreferenceScript] Failed to register preference panel", error);
    }
  }

  /**
   * Initialize preference panel
   * Called when preference window is opened
   */
  static init(window: Window): void {
    ztoolkit.log("[HistoryPreferenceScript] Initializing preference panel");
    
    this.window = window;
    this.bindEvents();
  }

  /**
   * Bind UI events
   */
  private static bindEvents(): void {
    if (!this.window) return;

    const doc = this.window.document;

    // Bind showInSidebar checkbox
    const showInSidebarCheckbox = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-history-showInSidebar`,
    ) as XUL.Checkbox;

    if (showInSidebarCheckbox) {
      // Initialize checkbox state from preference
      showInSidebarCheckbox.checked = HistoryPreferences.isShowInSidebar();
      
      ztoolkit.log(`[HistoryPreferenceScript] Initial showInSidebar state: ${showInSidebarCheckbox.checked}`);

      // Bind change event
      showInSidebarCheckbox.addEventListener("command", () => {
        const checked = showInSidebarCheckbox.checked;
        ztoolkit.log(`[HistoryPreferenceScript] showInSidebar changed to: ${checked}`);
        HistoryPreferences.setShowInSidebar(checked);
      });
    } else {
      ztoolkit.log("[HistoryPreferenceScript] showInSidebar checkbox not found");
    }

    // Bind cooldown controls (readonly input + increase/decrease buttons)
    const cooldownInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-history-cooldown`,
    ) as HTMLInputElement;

    const decreaseBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-history-cooldown-decrease`,
    ) as XUL.Button;

    const increaseBtn = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-history-cooldown-increase`,
    ) as XUL.Button;

    if (cooldownInput) {
      // Helper function to update value and save
      const updateCooldown = (newValue: number) => {
        const clampedValue = Math.max(
          CooldownConstraints.MIN_SECONDS,
          Math.min(CooldownConstraints.MAX_SECONDS, newValue)
        );
        cooldownInput.value = String(clampedValue);
        ztoolkit.log(`[HistoryPreferenceScript] Cooldown changed to: ${clampedValue} seconds`);
        HistoryPreferences.setCaptureCooldown(clampedValue);
        updateButtonStates(clampedValue);
      };

      // Helper function to update button disabled states
      const updateButtonStates = (value: number) => {
        if (decreaseBtn) {
          decreaseBtn.disabled = value <= CooldownConstraints.MIN_SECONDS;
        }
        if (increaseBtn) {
          increaseBtn.disabled = value >= CooldownConstraints.MAX_SECONDS;
        }
      };

      // Initialize input value from preference
      const initialValue = HistoryPreferences.getCaptureCooldown();
      cooldownInput.value = String(initialValue);
      updateButtonStates(initialValue);
      
      ztoolkit.log(`[HistoryPreferenceScript] Initial cooldown value: ${initialValue}`);

      // Bind decrease button
      if (decreaseBtn) {
        decreaseBtn.addEventListener("command", () => {
          const currentValue = parseInt(cooldownInput.value, 10) || CooldownConstraints.DEFAULT_SECONDS;
          updateCooldown(currentValue - CooldownConstraints.STEP_SECONDS);
        });
      }

      // Bind increase button
      if (increaseBtn) {
        increaseBtn.addEventListener("command", () => {
          const currentValue = parseInt(cooldownInput.value, 10) || CooldownConstraints.DEFAULT_SECONDS;
          updateCooldown(currentValue + CooldownConstraints.STEP_SECONDS);
        });
      }
    } else {
      ztoolkit.log("[HistoryPreferenceScript] Cooldown input not found");
    }
  }

  /**
   * Cleanup when preference window is closed
   */
  static cleanup(): void {
    ztoolkit.log("[HistoryPreferenceScript] Cleaning up preference panel");
    this.window = null;
  }
}
