/**
 * History Preferences Module
 * Manage reading history preference settings
 */

import { config } from "../../package.json";

/**
 * Preference keys for reading history
 */
export const HistoryPrefKeys = {
  SHOW_IN_SIDEBAR: "history.showInSidebar",
  CAPTURE_COOLDOWN: "history.captureCooldown",
} as const;

/**
 * Cooldown time constraints (in seconds)
 */
export const CooldownConstraints = {
  MIN_SECONDS: 10,
  MAX_SECONDS: 300, // 5 minutes
  DEFAULT_SECONDS: 10,
  STEP_SECONDS: 5,
} as const;

/**
 * Default values for preferences
 */
export const HistoryPrefDefaults: Record<string, boolean | string | number> = {
  [HistoryPrefKeys.SHOW_IN_SIDEBAR]: true,
  [HistoryPrefKeys.CAPTURE_COOLDOWN]: CooldownConstraints.DEFAULT_SECONDS,
};

/**
 * HistoryPreferences class
 * Provides methods to read, write, and listen to preference changes
 */
export class HistoryPreferences {
  private static observerIds: Map<string, symbol> = new Map();

  /**
   * Get the full preference key with prefix
   */
  private static getFullKey(key: string): string {
    return `${config.prefsPrefix}.${key}`;
  }

  /**
   * Get preference value
   */
  static get<K extends keyof typeof HistoryPrefDefaults>(
    key: K,
  ): (typeof HistoryPrefDefaults)[K] {
    const fullKey = this.getFullKey(key);
    const value = Zotero.Prefs.get(fullKey);
    
    // Return default if not set
    if (value === undefined || value === null) {
      return HistoryPrefDefaults[key];
    }
    
    return value as (typeof HistoryPrefDefaults)[K];
  }

  /**
   * Set preference value
   */
  static set<K extends keyof typeof HistoryPrefDefaults>(
    key: K,
    value: (typeof HistoryPrefDefaults)[K],
  ): void {
    const fullKey = this.getFullKey(key);
    Zotero.Prefs.set(fullKey, value);
    ztoolkit.log(`[HistoryPreferences] Set ${key} = ${value}`);
  }

  /**
   * Check if show in sidebar is enabled
   */
  static isShowInSidebar(): boolean {
    return this.get(HistoryPrefKeys.SHOW_IN_SIDEBAR) as boolean;
  }

  /**
   * Set show in sidebar preference
   */
  static setShowInSidebar(value: boolean): void {
    this.set(HistoryPrefKeys.SHOW_IN_SIDEBAR, value);
  }

  /**
   * Get capture cooldown in seconds
   */
  static getCaptureCooldown(): number {
    const value = this.get(HistoryPrefKeys.CAPTURE_COOLDOWN) as number;
    // Clamp value to valid range
    return Math.max(
      CooldownConstraints.MIN_SECONDS,
      Math.min(CooldownConstraints.MAX_SECONDS, value)
    );
  }

  /**
   * Get capture cooldown in milliseconds (for internal use)
   */
  static getCaptureCooldownMs(): number {
    return this.getCaptureCooldown() * 1000;
  }

  /**
   * Set capture cooldown in seconds
   * Value will be clamped to valid range
   */
  static setCaptureCooldown(seconds: number): void {
    const clampedValue = Math.max(
      CooldownConstraints.MIN_SECONDS,
      Math.min(CooldownConstraints.MAX_SECONDS, Math.round(seconds))
    );
    this.set(HistoryPrefKeys.CAPTURE_COOLDOWN, clampedValue);
  }

  /**
   * Register an observer for preference changes
   * @param key Preference key to observe
   * @param callback Function to call when preference changes
   * @returns Observer ID for unregistering
   */
  static observe(
    key: keyof typeof HistoryPrefDefaults,
    callback: (value: any) => void,
  ): symbol {
    const fullKey = this.getFullKey(key);
    
    const observerId = Zotero.Prefs.registerObserver(
      fullKey,
      (prefName: string) => {
        const value = this.get(key);
        ztoolkit.log(`[HistoryPreferences] Preference ${key} changed to ${value}`);
        callback(value);
      },
    ) as symbol;
    
    this.observerIds.set(key, observerId);
    ztoolkit.log(`[HistoryPreferences] Registered observer for ${key}`);
    
    return observerId;
  }

  /**
   * Unregister an observer
   */
  static unobserve(key: keyof typeof HistoryPrefDefaults): void {
    const observerId = this.observerIds.get(key);
    if (observerId) {
      Zotero.Prefs.unregisterObserver(observerId);
      this.observerIds.delete(key);
      ztoolkit.log(`[HistoryPreferences] Unregistered observer for ${key}`);
    }
  }

  /**
   * Unregister all observers
   */
  static unobserveAll(): void {
    for (const [key, observerId] of this.observerIds) {
      Zotero.Prefs.unregisterObserver(observerId);
      ztoolkit.log(`[HistoryPreferences] Unregistered observer for ${key}`);
    }
    this.observerIds.clear();
  }
}
