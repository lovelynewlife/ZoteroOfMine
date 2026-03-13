/**
 * Reading History Module
 * Display reading history using a button at the bottom
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ZDB } from "../utils/zdb";
import { HistoryStorage, ReadingHistoryEntry } from "./historyStore";
import { HistoryPreferences, HistoryPrefKeys } from "./historyPreferences";

export class ReadingHistoryFactory {
  private static history_notifierID: string | null = null;
  private static lastCaptureTime: Map<string, number> = new Map();
  private static historyRowId = `${config.addonRef}-history-row`;
  private static historyRowElement: HTMLElement | null = null;
  private static preferenceObserverId: symbol | null = null;
  
  // Shared state for dialog callbacks
  private static dialogSelectedItems: Set<number> | null = null;
  private static dialogFilteredEntries: ReadingHistoryEntry[] | null = null;
  private static dialogHistoryStorage: HistoryStorage | null = null;
  private static dialogDialogHelper: any = null;

  static async register() {
    ztoolkit.log("[ReadingHistory] Registering reading history feature");
    this.registerNotifier();
    ztoolkit.log("[ReadingHistory] Loading history from file");
    await HistoryStorage.getInstance().loadFromJSON();
    ztoolkit.log("[ReadingHistory] Loaded", HistoryStorage.getInstance().getCount(), "history entries");
    
    // Check preference and show/hide accordingly
    if (HistoryPreferences.isShowInSidebar()) {
      this.insertHistoryRow();
    }
    
    // Watch preference changes
    this.watchPreferenceChanges();
  }

  /**
   * Watch for preference changes and update UI accordingly
   */
  private static watchPreferenceChanges(): void {
    this.preferenceObserverId = HistoryPreferences.observe(
      HistoryPrefKeys.SHOW_IN_SIDEBAR,
      (showInSidebar: boolean) => {
        if (showInSidebar) {
          ztoolkit.log("[ReadingHistory] Preference changed: showing in sidebar");
          this.insertHistoryRow();
        } else {
          ztoolkit.log("[ReadingHistory] Preference changed: hiding from sidebar");
          this.removeHistoryRow();
        }
      }
    );
  }

  /**
   * Remove history row from sidebar
   */
  private static removeHistoryRow(): void {
    if (this.historyRowElement) {
      this.historyRowElement.remove();
      this.historyRowElement = null;
      ztoolkit.log("[ReadingHistory] History row removed from sidebar");
    }
  }

  private static insertHistoryRow() {
    try {
      const win = window;
      const doc = win.document;

      if (doc.readyState !== "complete") {
        win.addEventListener("load", () => this.insertHistoryRow(), { once: true });
        return;
      }

      setTimeout(() => {
        const historyRow = this.createHistoryRow(doc);
        this.findAndInsert(historyRow, doc);
      }, 1000);
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Insert row failed:", e);
    }
  }

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
            this.showHistoryDialog();
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
          styles: { marginRight: "8px", fontSize: "16px", lineHeight: "1" },
          properties: { innerText: "📖" },
        },
        {
          tag: "span",
          namespace: "html",
          styles: { fontSize: "inherit", fontWeight: "400", userSelect: "none", color: "var(--fill-primary)" },
          properties: { innerText: getString("reading-history-label") },
        },
      ],
    }) as HTMLElement;
  }

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

    const collectionsPane = doc.querySelector("#zotero-collections-pane") as HTMLElement;
    if (collectionsPane?.parentElement) {
      collectionsPane.insertAdjacentElement("afterend", historyRow);
      this.historyRowElement = historyRow;
    }
  }

  private static async showHistoryDialog() {
    try {
      const historyStorage = HistoryStorage.getInstance();
      await historyStorage.ensureLoaded();
      const entries = historyStorage.getAll();
      const searchInputId = `${config.addonRef}-history-search-input`;
      const tableBodyId = `${config.addonRef}-history-tbody`;
      const selectAllCheckboxId = `${config.addonRef}-select-all-checkbox`;

      const ensurePendingCompat = (lock: any) => {
        // ztoolkit dialog internals expect Bluebird-style `isPending()`.
        // Native promises don't provide it, so we shim the minimal behavior.
        const promise = lock?.promise as any;
        if (!promise || typeof promise.isPending === "function") return;

        let settled = false;
        Promise.resolve(promise).finally(() => {
          settled = true;
        });

        promise.isPending = () => !settled;
      };

      const dialogData: { [key: string | number]: any } = {
        loadCallback: () => {
          ensurePendingCompat(dialogData.loadLock);
          ensurePendingCompat(dialogData.unloadLock);
          const dialogWin = dialogHelper.window;
          if (!dialogWin) return;

          const tbody = dialogWin.document.querySelector(`#${tableBodyId}`) as HTMLTableSectionElement | null;
          const searchInput = dialogWin.document.querySelector(`#${searchInputId}`) as HTMLInputElement | null;
          
          if (!tbody) return;

          // Sort state
          const sortState = {
            key: "captureTime" as "title" | "authors" | "captureTime",
            asc: false,
          };

          // Initialize shared state for callbacks
          ReadingHistoryFactory.dialogSelectedItems = new Set<number>();
          ReadingHistoryFactory.dialogFilteredEntries = [...entries];
          ReadingHistoryFactory.dialogHistoryStorage = historyStorage;
          ReadingHistoryFactory.dialogDialogHelper = dialogHelper;

          const selectedItems = ReadingHistoryFactory.dialogSelectedItems!;
          let filteredEntries = [...entries];
          
          // Helper functions
          const setRowCellBackground = (row: HTMLElement, color: string) => {
            row.querySelectorAll("td").forEach((cell) => {
              (cell as HTMLElement).style.backgroundColor = color;
            });
          };

          const updateDeleteButtonState = () => {
            const deleteLabel = getString("delete-selected-label");
            const selectors = ["button", ".dialog-button-box button"];
            for (const selector of selectors) {
              const allButtons = dialogWin.document.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>;
              for (const btn of allButtons) {
                if (btn.textContent?.trim().includes(deleteLabel)) {
                  btn.disabled = selectedItems.size === 0;
                  return;
                }
              }
            }
          };

          const updateSelectAllState = () => {
            const selectAllCheckbox = dialogWin.document.querySelector(`#${selectAllCheckboxId}`) as HTMLInputElement | null;
            if (!selectAllCheckbox) return;
            const allSelected = filteredEntries.length > 0 && filteredEntries.every(entry => selectedItems.has(entry.item.id));
            selectAllCheckbox.checked = allSelected;
            selectAllCheckbox.indeterminate = !allSelected && selectedItems.size > 0;
          };

          const renderRow = (entry: ReadingHistoryEntry): HTMLTableRowElement => {
            const tr = dialogWin.document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.dataset.itemId = String(entry.item.id);
            
            // Double-click opens the corresponding item and closes dialog
            tr.addEventListener("dblclick", () => {
              dialogHelper.window?.close();
              setTimeout(() => this.openItem(entry.item.id), 100);
            });
            tr.addEventListener("mouseenter", () => setRowCellBackground(tr, "var(--fill-quinary)"));
            tr.addEventListener("mouseleave", () => setRowCellBackground(tr, "-moz-dialog"));

            // Checkbox cell
            const checkboxCell = dialogWin.document.createElement("td");
            checkboxCell.style.padding = "4px 8px";
            checkboxCell.style.borderBottom = "1px solid var(--fill-quinary)";
            checkboxCell.style.backgroundColor = "-moz-dialog";
            checkboxCell.style.width = "40px";

            const checkbox = dialogWin.document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedItems.has(entry.item.id);
            checkbox.addEventListener("change", () => {
              if (checkbox.checked) {
                selectedItems.add(entry.item.id);
              } else {
                selectedItems.delete(entry.item.id);
              }
              updateDeleteButtonState();
              updateSelectAllState();
            });
            checkbox.addEventListener("click", (e) => e.stopPropagation());
            checkboxCell.appendChild(checkbox);
            tr.appendChild(checkboxCell);

            // Title cell
            const titleCell = dialogWin.document.createElement("td");
            titleCell.textContent = entry.item.title;
            titleCell.style.padding = "4px 8px";
            titleCell.style.borderBottom = "1px solid var(--fill-quinary)";
            titleCell.style.backgroundColor = "-moz-dialog";
            tr.appendChild(titleCell);

            // Authors cell
            const authorsCell = dialogWin.document.createElement("td");
            authorsCell.textContent = entry.item.authors;
            authorsCell.style.padding = "4px 8px";
            authorsCell.style.borderBottom = "1px solid var(--fill-quinary)";
            authorsCell.style.backgroundColor = "-moz-dialog";
            tr.appendChild(authorsCell);

            // Time cell
            const timeCell = dialogWin.document.createElement("td");
            timeCell.textContent = new Date(entry.captureTime).toLocaleString();
            timeCell.style.padding = "4px 8px";
            timeCell.style.borderBottom = "1px solid var(--fill-quinary)";
            timeCell.style.whiteSpace = "nowrap";
            timeCell.style.backgroundColor = "-moz-dialog";
            tr.appendChild(timeCell);

            return tr;
          };

          const renderRows = () => {
            while (tbody.firstChild) {
              tbody.removeChild(tbody.firstChild);
            }

            if (filteredEntries.length === 0) {
              const tr = dialogWin.document.createElement("tr");
              const td = dialogWin.document.createElement("td");
              td.colSpan = 4;
              td.textContent = getString("no-history-yet");
              td.style.padding = "20px";
              td.style.textAlign = "center";
              td.style.color = "var(--fill-secondary)";
              td.style.backgroundColor = "-moz-dialog";
              tr.appendChild(td);
              tbody.appendChild(tr);
              return;
            }

            for (const entry of filteredEntries) {
              tbody.appendChild(renderRow(entry));
            }

            updateSelectAllState();
          };

          const applyFilterAndSort = () => {
            // Filter
            const keyword = (searchInput?.value || "").trim().toLowerCase();
            filteredEntries = keyword
              ? entries.filter((entry) => {
                  const title = (entry.item.title || "").toLowerCase();
                  const authors = (entry.item.authors || "").toLowerCase();
                  return title.includes(keyword) || authors.includes(keyword);
                })
              : [...entries];

            // Sort
            filteredEntries.sort((a, b) => {
              let compare = 0;
              if (sortState.key === "captureTime") {
                compare = a.captureTime - b.captureTime;
              } else if (sortState.key === "title") {
                compare = (a.item.title || "").localeCompare(b.item.title || "");
              } else {
                compare = (a.item.authors || "").localeCompare(b.item.authors || "");
              }
              return sortState.asc ? compare : -compare;
            });

            // Clear selection when filter/sort changes
            selectedItems.clear();
            updateDeleteButtonState();
            renderRows();
          };

          // Search input
          if (searchInput) {
            searchInput.addEventListener("input", applyFilterAndSort);
          }

          // Sort headers
          const bindSort = (thId: string, key: "title" | "authors" | "captureTime") => {
            const th = dialogWin.document.querySelector(`#${thId}`) as HTMLElement | null;
            if (!th) return;
            th.style.cursor = "pointer";
            th.addEventListener("click", () => {
              if (sortState.key === key) {
                sortState.asc = !sortState.asc;
              } else {
                sortState.key = key;
                sortState.asc = true;
              }
              applyFilterAndSort();
            });
          };

          bindSort(`${config.addonRef}-sort-title`, "title");
          bindSort(`${config.addonRef}-sort-authors`, "authors");
          bindSort(`${config.addonRef}-sort-time`, "captureTime");

          // Select all checkbox
          const selectAllCheckbox = dialogWin.document.querySelector(`#${selectAllCheckboxId}`) as HTMLInputElement | null;
          if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener("change", (e) => {
              const checked = (e.target as HTMLInputElement).checked;
              if (checked) {
                filteredEntries.forEach(entry => selectedItems.add(entry.item.id));
              } else {
                selectedItems.clear();
              }
              updateDeleteButtonState();
              renderRows();
            });
          }

          // Enter key handling
          dialogWin.document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            const active = dialogWin.document.activeElement as HTMLElement | null;
            if (active?.id === searchInputId) return;
            const firstEntry = filteredEntries[0];
            if (!firstEntry) return;
            dialogHelper.window?.close();
            setTimeout(() => this.openItem(firstEntry.item.id), 100);
          });

          // Initial render
          applyFilterAndSort();

          // Initialize delete button state after dialog is fully loaded
          const deleteLabel = getString("delete-selected-label");
          const initDeleteButtonState = () => {
            const selectors = ["button", ".dialog-button-box button"];
            for (const selector of selectors) {
              const allButtons = dialogWin.document.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>;
              for (const btn of allButtons) {
                if (btn.textContent?.trim().includes(deleteLabel)) {
                  btn.disabled = true;
                  return;
                }
              }
            }
          };

          // Initialize delete by time buttons
          const initDeleteByTimeButtons = () => {
            ztoolkit.log("[ReadingHistory] initDeleteByTimeButtons called");
            const periods = [
              { id: "day", value: "day" },
              { id: "week", value: "week" },
              { id: "month", value: "month" },
              { id: "quarter", value: "quarter" },
              { id: "half-year", value: "half-year" },
              { id: "year", value: "year" },
            ];
            
            periods.forEach(({ id, value }) => {
              const buttonId = `${config.addonRef}-delete-by-time-${id}`;
              const button = dialogWin.document.getElementById(buttonId) as HTMLButtonElement | null;
              if (!button) {
                ztoolkit.log(`[ReadingHistory] Button ${buttonId} not found`);
                return;
              }
              
              // Check if listener already attached to avoid duplicates
              if ((button as any).__listenerAttached) {
                ztoolkit.log(`[ReadingHistory] Button ${buttonId} already has listener, skipping`);
                return;
              }
              
              (button as any).__listenerAttached = true;
              ztoolkit.log(`[ReadingHistory] Button ${buttonId} found, adding listener`);
              
              button.addEventListener("click", async () => {
                ztoolkit.log(`[ReadingHistory] Delete by time button clicked for period: ${value}`);
                
                const periodTranslations: Record<string, string> = {
                  "day": getString("time-period-day"),
                  "week": getString("time-period-week"),
                  "month": getString("time-period-month"),
                  "quarter": getString("time-period-quarter"),
                  "half-year": getString("time-period-half-year"),
                  "year": getString("time-period-year"),
                };
                
                const translatedPeriod = periodTranslations[value] || value;
                ztoolkit.log("[ReadingHistory] Period:", value);
                ztoolkit.log("[ReadingHistory] Translated period:", translatedPeriod);
                
                // Calculate threshold time
                const now = Date.now();
                const timeThresholds: Record<string, number> = {
                  "day": 24 * 60 * 60 * 1000,
                  "week": 7 * 24 * 60 * 60 * 1000,
                  "month": 30 * 24 * 60 * 60 * 1000,
                  "quarter": 90 * 24 * 60 * 60 * 1000,
                  "half-year": 180 * 24 * 60 * 60 * 1000,
                  "year": 365 * 24 * 60 * 60 * 1000,
                };
                const thresholdMs = timeThresholds[value] || timeThresholds["week"];
                const thresholdTime = now - thresholdMs;
                
                // Get original message and try replacement
                const originalConfirmMessage = getString("delete-by-time-confirm");
                ztoolkit.log("[ReadingHistory] Original confirm message:", originalConfirmMessage);
                
                // Try different replacement patterns (try without space first)
                let confirmMessage = originalConfirmMessage;
                confirmMessage = confirmMessage.replace("{$period}", translatedPeriod);
                confirmMessage = confirmMessage.replace("{ $period }", translatedPeriod);
                confirmMessage = confirmMessage.replace("{ $period}", translatedPeriod);
                
                ztoolkit.log("[ReadingHistory] Final confirm message:", confirmMessage);
                
                const confirmed = Services.prompt.confirm(
                  dialogWin,
                  getString("delete-by-time-title"),
                  confirmMessage
                );
                
                ztoolkit.log("[ReadingHistory] Confirmed:", confirmed);
                
                if (confirmed) {
                  // Delete entries older than threshold
                  const entriesToDelete = filteredEntries.filter(
                    (entry) => entry.captureTime < thresholdTime
                  );
                  ztoolkit.log("[ReadingHistory] Entries to delete:", entriesToDelete.length);
                  
                  if (entriesToDelete.length > 0) {
                    const itemIdsToDelete = entriesToDelete.map((e) => e.item.id);
                    ztoolkit.log("[ReadingHistory] Deleting item IDs:", itemIdsToDelete);
                    
                    // Delete all entries
                    for (const itemId of itemIdsToDelete) {
                      await historyStorage.deleteByItemID(itemId);
                    }
                    
                    // Update filtered entries
                    filteredEntries = filteredEntries.filter(
                      (entry) => !itemIdsToDelete.includes(entry.item.id)
                    );
                    
                    // Re-render
                    renderRows();
                    
                    // Show success message
                    const originalSuccessMessage = getString("delete-by-time-success");
                    ztoolkit.log("[ReadingHistory] Original success message:", originalSuccessMessage);
                    ztoolkit.log("[ReadingHistory] Entries deleted count:", entriesToDelete.length);
                    
                    let successMessage = originalSuccessMessage;
                    // Replace count first
                    successMessage = successMessage.replace("{$count}", String(entriesToDelete.length));
                    successMessage = successMessage.replace("{ $count }", String(entriesToDelete.length));
                    successMessage = successMessage.replace("{ $count}", String(entriesToDelete.length));
                    // Then replace period
                    successMessage = successMessage.replace("{$period}", translatedPeriod);
                    successMessage = successMessage.replace("{ $period }", translatedPeriod);
                    successMessage = successMessage.replace("{ $period}", translatedPeriod);
                    
                    ztoolkit.log("[ReadingHistory] Final success message:", successMessage);
                    
                    new ztoolkit.ProgressWindow(config.addonName)
                      .createLine({
                        text: successMessage,
                        type: "success",
                        progress: 100,
                      })
                      .show();
                  } else {
                    ztoolkit.log("[ReadingHistory] No entries to delete");
                  }
                }
              });
            });
          };

          // Try to find button with delays
          initDeleteButtonState();
          setTimeout(initDeleteButtonState, 100);
          setTimeout(initDeleteButtonState, 300);
          setTimeout(initDeleteButtonState, 500);
          
          // Initialize delete by time buttons
          initDeleteByTimeButtons();
          setTimeout(initDeleteByTimeButtons, 100);
          setTimeout(initDeleteByTimeButtons, 300);
          setTimeout(initDeleteByTimeButtons, 500);
        },
        unloadCallback: () => {
          // no-op
        },
      };

      const dialogHelper = new ztoolkit.Dialog(2, 1)
        .setDialogData(dialogData)
        .addCell(0, 0, {
          tag: "div",
          namespace: "html",
          styles: {
            width: "700px",
            height: "400px",
            border: "1px solid var(--fill-quinary)",
            display: "flex",
            flexDirection: "column",
            padding: "8px",
            gap: "8px",
          },
          children: [
            {
              tag: "input",
              namespace: "html",
              id: searchInputId,
              attributes: {
                type: "search",
                placeholder: `${getString("column-title")} / ${getString("column-authors")}`,
              },
              styles: {
                width: "100%",
                padding: "6px 8px",
                border: "1px solid var(--fill-quinary)",
                backgroundColor: "-moz-dialog",
                color: "var(--fill-primary)",
              },
            },
            {
              tag: "div",
              namespace: "html",
              styles: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
              },
              children: [
                {
                  tag: "div",
                  namespace: "html",
                  styles: {
                    fontSize: "13px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  },
                  properties: { innerText: getString("delete-by-time-label") },
                },
                {
                  tag: "div",
                  namespace: "html",
                  styles: {
                    display: "flex",
                    gap: "4px",
                    flexWrap: "wrap",
                  },
                  children: [
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-day`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-day") },
                    },
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-week`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-week") },
                    },
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-month`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-month") },
                    },
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-quarter`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-quarter") },
                    },
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-half-year`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-half-year") },
                    },
                    {
                      tag: "button",
                      namespace: "html",
                      id: `${config.addonRef}-delete-by-time-year`,
                      styles: {
                        padding: "4px 8px",
                        border: "1px solid var(--fill-quinary)",
                        backgroundColor: "-moz-dialog",
                        color: "var(--fill-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      },
                      properties: { innerText: getString("time-period-year") },
                    },
                  ],
                },
              ],
            },
            {
              tag: "div",
              namespace: "html",
              styles: {
                flex: "1",
                minHeight: "0",
                overflow: "auto",
              },
              children: [
                {
                  tag: "table",
                  namespace: "html",
                  styles: {
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: "0",
                    fontSize: "13px",
                  },
                  children: [
                    {
                      tag: "thead",
                      namespace: "html",
                      children: [
                        {
                          tag: "tr",
                          namespace: "html",
                          styles: { position: "sticky", top: "0" },
                          children: [
                            {
                              tag: "th",
                              namespace: "html",
                              id: `${config.addonRef}-select-all-header`,
                              styles: {
                                padding: "8px",
                                textAlign: "center",
                                borderBottom: "2px solid var(--fill-tertiary)",
                                fontWeight: "500",
                                backgroundColor: "-moz-dialog",
                                width: "40px",
                              },
                              children: [
                                {
                                  tag: "input",
                                  namespace: "html",
                                  id: selectAllCheckboxId,
                                  attributes: { type: "checkbox" },
                                },
                              ],
                            },
                            {
                              tag: "th",
                              namespace: "html",
                              id: `${config.addonRef}-sort-title`,
                              styles: {
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid var(--fill-tertiary)",
                                fontWeight: "500",
                                backgroundColor: "-moz-dialog",
                              },
                              properties: { innerText: getString("column-title") },
                            },
                            {
                              tag: "th",
                              namespace: "html",
                              id: `${config.addonRef}-sort-authors`,
                              styles: {
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid var(--fill-tertiary)",
                                fontWeight: "500",
                                backgroundColor: "-moz-dialog",
                              },
                              properties: { innerText: getString("column-authors") },
                            },
                            {
                              tag: "th",
                              namespace: "html",
                              id: `${config.addonRef}-sort-time`,
                              styles: {
                                padding: "8px",
                                textAlign: "left",
                                borderBottom: "2px solid var(--fill-tertiary)",
                                fontWeight: "500",
                                backgroundColor: "-moz-dialog",
                              },
                              properties: { innerText: getString("column-time") },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      tag: "tbody",
                      namespace: "html",
                      id: tableBodyId,
                    },
                  ],
                },
              ],
            },
          ],
        })
        .addButton(getString("delete-selected-label"), "delete-selected", {
          noClose: true,
          callback: async () => {
            const selectedItems = ReadingHistoryFactory.dialogSelectedItems;
            if (!selectedItems) return false;

            const selectedIDs = Array.from(selectedItems);
            const selectedCount = selectedIDs.length;
            if (selectedCount === 0) return false;

            const dialogWin = dialogHelper.window;
            if (!dialogWin) return false;

            const message = getString("delete-selected-confirm", { args: { count: selectedCount } });
            const confirmed = Services.prompt.confirm(
              dialogWin,
              getString("delete-selected-title"),
              message
            );

            if (confirmed) {
              const historyStorage = ReadingHistoryFactory.dialogHistoryStorage;
              if (!historyStorage) return false;

              // Delete selected items
              for (const itemID of selectedIDs) {
                await historyStorage.deleteByItemID(itemID);
              }

              // Clear selection
              selectedItems.clear();

              // Reload and re-render
              const allEntries = historyStorage.getAll();
              ReadingHistoryFactory.dialogFilteredEntries = allEntries;

              const tbody = dialogWin.document.querySelector(`#${tableBodyId}`) as HTMLTableSectionElement | null;
              if (!tbody) return false;

              const searchInput = dialogWin.document.querySelector(`#${searchInputId}`) as HTMLInputElement | null;
              const keyword = (searchInput?.value || "").trim().toLowerCase();

              let filteredEntries = [...allEntries];
              if (keyword) {
                filteredEntries = allEntries.filter((entry) => {
                  const title = (entry.item.title || "").toLowerCase();
                  const authors = (entry.item.authors || "").toLowerCase();
                  return title.includes(keyword) || authors.includes(keyword);
                });
              }

              // Re-render
              while (tbody.firstChild) {
                tbody.removeChild(tbody.firstChild);
              }

              if (filteredEntries.length === 0) {
                const tr = dialogWin.document.createElement("tr");
                const td = dialogWin.document.createElement("td");
                td.colSpan = 4;
                td.textContent = getString("no-history-yet");
                td.style.padding = "20px";
                td.style.textAlign = "center";
                td.style.color = "var(--fill-secondary)";
                td.style.backgroundColor = "-moz-dialog";
                tr.appendChild(td);
                tbody.appendChild(tr);
              } else {
                for (const entry of filteredEntries) {
                  const tr = dialogWin.document.createElement("tr");
                  tr.style.cursor = "pointer";
                  tr.dataset.itemId = String(entry.item.id);
                  tr.addEventListener("dblclick", () => {
                    dialogHelper.window?.close();
                    setTimeout(() => this.openItem(entry.item.id), 100);
                  });

                  // Checkbox cell
                  const checkboxCell = dialogWin.document.createElement("td");
                  checkboxCell.style.padding = "4px 8px";
                  checkboxCell.style.borderBottom = "1px solid var(--fill-quinary)";
                  checkboxCell.style.backgroundColor = "-moz-dialog";
                  checkboxCell.style.width = "40px";

                  const checkbox = dialogWin.document.createElement("input");
                  checkbox.type = "checkbox";
                  checkbox.addEventListener("change", () => {
                    if (checkbox.checked) {
                      selectedItems.add(entry.item.id);
                    } else {
                      selectedItems.delete(entry.item.id);
                    }
                    const deleteLabel = getString("delete-selected-label");
                    const selectors = ["button", ".dialog-button-box button"];
                    for (const selector of selectors) {
                      const allButtons = dialogWin.document.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>;
                      for (const btn of allButtons) {
                        if (btn.textContent?.trim().includes(deleteLabel)) {
                          btn.disabled = selectedItems.size === 0;
                          return;
                        }
                      }
                    }
                  });
                  checkbox.addEventListener("click", (e) => e.stopPropagation());
                  checkboxCell.appendChild(checkbox);
                  tr.appendChild(checkboxCell);

                  // Title cell
                  const titleCell = dialogWin.document.createElement("td");
                  titleCell.textContent = entry.item.title;
                  titleCell.style.padding = "4px 8px";
                  titleCell.style.borderBottom = "1px solid var(--fill-quinary)";
                  titleCell.style.backgroundColor = "-moz-dialog";
                  tr.appendChild(titleCell);

                  // Authors cell
                  const authorsCell = dialogWin.document.createElement("td");
                  authorsCell.textContent = entry.item.authors;
                  authorsCell.style.padding = "4px 8px";
                  authorsCell.style.borderBottom = "1px solid var(--fill-quinary)";
                  authorsCell.style.backgroundColor = "-moz-dialog";
                  tr.appendChild(authorsCell);

                  // Time cell
                  const timeCell = dialogWin.document.createElement("td");
                  timeCell.textContent = new Date(entry.captureTime).toLocaleString();
                  timeCell.style.padding = "4px 8px";
                  timeCell.style.borderBottom = "1px solid var(--fill-quinary)";
                  timeCell.style.whiteSpace = "nowrap";
                  timeCell.style.backgroundColor = "-moz-dialog";
                  tr.appendChild(timeCell);

                  tbody.appendChild(tr);
                }
              }

              // Update delete button and show success message
              const deleteLabel = getString("delete-selected-label");
              const selectors = ["button", ".dialog-button-box button"];
              for (const selector of selectors) {
                const allButtons = dialogWin.document.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>;
                for (const btn of allButtons) {
                  if (btn.textContent?.trim().includes(deleteLabel)) {
                    btn.disabled = true;
                    const successMessage = getString("delete-success-message", { args: { count: selectedCount } });
                    new ztoolkit.ProgressWindow(config.addonName)
                      .createLine({
                        text: successMessage,
                        type: "success",
                        progress: 100,
                      })
                      .show();
                    return false;
                  }
                }
              }
            }
            
            return false;
          }
        })
        .addButton(getString("clear-history-label"), "clear-all", {
          noClose: true,
          callback: () => {
            const confirmed = Services.prompt.confirm(
              dialogHelper.window,
              getString("clear-history-title"),
              getString("clear-history-confirm")
            );
            if (confirmed) {
              historyStorage.clear().then(() => {
                // Clear all entries from the table
                const tbody = dialogHelper.window.document.querySelector(`#${tableBodyId}`) as HTMLTableSectionElement | null;
                if (tbody) {
                  while (tbody.firstChild) {
                    tbody.removeChild(tbody.firstChild);
                  }
                  // Show empty message
                  const tr = dialogHelper.window.document.createElement("tr");
                  const td = dialogHelper.window.document.createElement("td");
                  td.colSpan = 4;
                  td.textContent = getString("no-history-yet");
                  td.style.padding = "20px";
                  td.style.textAlign = "center";
                  td.style.color = "var(--fill-secondary)";
                  td.style.backgroundColor = "-moz-dialog";
                  tr.appendChild(td);
                  tbody.appendChild(tr);
                }
                
                new ztoolkit.ProgressWindow(config.addonName)
                  .createLine({
                    text: getString("clear-success-message"),
                    type: "success",
                    progress: 100,
                  })
                  .show();
              });
            }
            return false;
          }
        })
        .addButton(getString("close-label") || "Close", "close")
        .open(getString("reading-history-label") || "Reading History", {
          width: 750,
          height: 500,
          centerscreen: true,
          resizable: true,
        });

      ensurePendingCompat(dialogData.loadLock);
      ensurePendingCompat(dialogData.unloadLock);

      addon.data.dialog = dialogHelper;
      await dialogData.unloadLock.promise;
      addon.data.dialog = undefined;

    } catch (e) {
      ztoolkit.log("[ReadingHistory] Dialog failed:", e);
    }
  }

  private static openItem(itemID: number) {
    try {
      const pane = Zotero.getActiveZoteroPane();
      if (!pane) return;

      const item = Zotero.Items.get(itemID);
      if (!item) return;

      pane.selectItem(itemID);

      if (item.isAttachment()) {
        Zotero.Reader.open(itemID);
      } else {
        const attachments = item.getAttachments();
        if (attachments && attachments.length > 0) {
          Zotero.Reader.open(attachments[0]);
        }
      }
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Open item failed:", e);
    }
  }

  static registerNotifier() {
    const callback = {
      notify: async (event: string, type: string, ids: Array<string | number>, extraData: { [key: string]: any }) => {
        if (!addon?.data.alive) return;
        try {
          await this.onHistoryRecording(event, type, ids, extraData);
        } catch (e) {
          ztoolkit.log("[ReadingHistory] Notifier failed:", e);
        }
      },
    };

    this.history_notifierID = Zotero.Notifier.registerObserver(callback, ["tab"]);
    window.addEventListener("unload", () => this.unregisterNotifier(), false);
  }

  private static async onHistoryRecording(event: string, type: string, ids: Array<string | number>, extraData: { [key: string]: any }) {
    if (type !== "tab") return;
    if (event !== "load" && event !== "select" && event !== "add") return;

    const rawTabID = ids[0];
    if (rawTabID === undefined || rawTabID === null) return;

    const tabID = String(rawTabID);
    const tabData = extraData?.[tabID] ?? extraData?.[rawTabID as any];

    if (!tabData || tabData.type !== "reader") return;
    if (!this.shouldCapture(tabID)) return;

    await this.captureReadingHistory(tabID);
  }

  private static shouldCapture(tabID: string): boolean {
    const now = Date.now();
    const lastTime = this.lastCaptureTime.get(tabID);
    const cooldownMs = HistoryPreferences.getCaptureCooldownMs();

    if (lastTime && (now - lastTime) < cooldownMs) {
      return false;
    }

    this.lastCaptureTime.set(tabID, now);
    return true;
  }

  private static async captureReadingHistory(tabID: string) {
    try {
      const reader = Zotero.Reader.getByTabID(tabID);
      if (!reader || !reader.itemID) return;

      const itemInfo = ZDB.getItemInfoByAttachmentID(reader.itemID);
      if (!itemInfo) return;

      await HistoryStorage.getInstance().add({ item: itemInfo });
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Capture failed:", e);
    }
  }

  private static unregisterNotifier() {
    if (this.history_notifierID) {
      Zotero.Notifier.unregisterObserver(this.history_notifierID);
      this.history_notifierID = null;
    }
  }

  static async unregister() {
    ztoolkit.log("[ReadingHistory] Unregistering reading history feature");
    
    // Force save before unregistering and wait for completion
    try {
      await HistoryStorage.getInstance().forceSave();
      ztoolkit.log("[ReadingHistory] Save completed successfully");
    } catch (e) {
      ztoolkit.log("[ReadingHistory] Force save failed:", e);
    }

    // Remove history row
    this.removeHistoryRow();

    // Unregister preference observer
    if (this.preferenceObserverId) {
      HistoryPreferences.unobserve(HistoryPrefKeys.SHOW_IN_SIDEBAR);
      this.preferenceObserverId = null;
    }

    if (addon.data.dialog) {
      addon.data.dialog.window?.close();
      addon.data.dialog = undefined;
    }

    this.unregisterNotifier();
    this.lastCaptureTime.clear();
  }
}
