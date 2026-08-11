import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Global UI state for the application shell.
 *
 * - `sidebarCollapsed` is persisted (desktop rail preference).
 * - `utilityPanelOpen` is persisted (right panel preference).
 * - `mobileSidebarOpen` is ephemeral (drawer overlay on small screens).
 */
interface UiState {
  sidebarCollapsed: boolean;
  utilityPanelOpen: boolean;
  mobileSidebarOpen: boolean;
  quickSearchOpen: boolean;
  expandedNavGroups: Record<string, boolean>;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleUtilityPanel: () => void;
  setUtilityPanelOpen: (open: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  openQuickSearch: () => void;
  closeQuickSearch: () => void;
  toggleNavGroup: (groupId: string) => void;
  setNavGroupExpanded: (groupId: string, expanded: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      utilityPanelOpen: true,
      mobileSidebarOpen: false,
      quickSearchOpen: false,
      expandedNavGroups: {},
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      toggleUtilityPanel: () =>
        set((state) => ({ utilityPanelOpen: !state.utilityPanelOpen })),
      setUtilityPanelOpen: (open) => set({ utilityPanelOpen: open }),
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
      openQuickSearch: () => set({ quickSearchOpen: true }),
      closeQuickSearch: () => set({ quickSearchOpen: false }),
      toggleNavGroup: (groupId) =>
        set((state) => ({
          expandedNavGroups: {
            ...state.expandedNavGroups,
            [groupId]: !state.expandedNavGroups[groupId],
          },
        })),
      setNavGroupExpanded: (groupId, expanded) =>
        set((state) => ({
          expandedNavGroups: {
            ...state.expandedNavGroups,
            [groupId]: expanded,
          },
        })),
    }),
    {
      name: "okb-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        utilityPanelOpen: state.utilityPanelOpen,
        expandedNavGroups: state.expandedNavGroups,
      }),
    },
  ),
);
