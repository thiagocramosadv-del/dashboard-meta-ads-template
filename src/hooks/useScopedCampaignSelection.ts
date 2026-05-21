import { useSyncExternalStore } from "react";
import {
  Scope,
  getSelection,
  subscribe,
  toggle as toggleSelection,
  selectAll as selectAllAction,
  clearAll as clearAllAction,
  setSelection,
} from "@/lib/scopedCampaignSelection";

export interface ScopedCampaignSelection {
  /** ids selecionados; quando null = todas (default). */
  selectedSet: Set<string> | null;
  isAllSelected: boolean;
  selectedCount: number;
  toggle: (id: string) => void;
  selectAll: () => void;
  clearAll: () => void;
  setIds: (ids: string[]) => void;
  /** Filtra in-place: se nada selecionado (todas) → retorna full list. */
  filterByCampaignId: <T extends { campanhaId?: string }>(rows: T[]) => T[];
}

export function useScopedCampaignSelection(
  scope: Scope,
  allCampaignIds: string[]
): ScopedCampaignSelection {
  const state = useSyncExternalStore(
    (cb) => subscribe(scope, cb),
    () => getSelection(scope),
    () => null
  );

  const isAllSelected = state === null;
  const selectedCount = state === null ? allCampaignIds.length : state.size;

  return {
    selectedSet: state,
    isAllSelected,
    selectedCount,
    toggle: (id) => toggleSelection(scope, id, allCampaignIds),
    selectAll: () => selectAllAction(scope),
    clearAll: () => clearAllAction(scope),
    setIds: (ids) => setSelection(scope, new Set(ids)),
    filterByCampaignId: (rows) => {
      // "nenhuma selecionada" → mostra todas (nunca esconde tudo)
      if (state === null || state.size === 0) return rows;
      return rows.filter((r) => r.campanhaId && state.has(r.campanhaId));
    },
  };
}
