import { useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeta } from "@/lib/metaAds";
import { CampaignsCtx, type Campaign, type CampaignsCtxValue } from "./campaignsCtx";

export { useCampaigns } from "./campaignsCtx";
export type { Campaign } from "./campaignsCtx";

const SELECTED_KEY = "santosads.selectedCampaigns";
const EXCLUDED_KEY = "santosads.excludedFromChampion";

const readSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
};

const writeSet = (key: string, set: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* noop */
  }
};

export const CampaignsProvider = ({ children }: { children: ReactNode }) => {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["meta", "campaigns"],
    queryFn: async () => {
      const arr = await fetchMeta<Campaign>({
        endpoint: "campaigns",
        params: { fields: "id,name,status,effective_status", limit: 200 },
      });
      return arr;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const [selected, setSelected] = useState<Set<string> | null>(() => {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (raw === null) return null;
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return null;
      return new Set(arr.map(String));
    } catch {
      return null;
    }
  });

  const [excluded, setExcluded] = useState<Set<string>>(() => readSet(EXCLUDED_KEY));

  useEffect(() => {
    if (selected === null) {
      localStorage.removeItem(SELECTED_KEY);
    } else {
      writeSet(SELECTED_KEY, selected);
    }
  }, [selected]);

  useEffect(() => {
    writeSet(EXCLUDED_KEY, excluded);
  }, [excluded]);

  const allIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);

  useEffect(() => {
    if (selected && campaigns.length > 0) {
      const valid = new Set(allIds);
      const filtered = new Set(Array.from(selected).filter((id) => valid.has(id)));
      if (filtered.size !== selected.size) setSelected(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const isAllSelected = selected === null || (campaigns.length > 0 && selected.size === campaigns.length);

  const selectedIds = useMemo(() => {
    if (selected === null) return allIds;
    return Array.from(selected);
  }, [selected, allIds]);

  const effectiveCampaignIds = isAllSelected ? [] : selectedIds;

  const toggleSelected = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const base = prev === null ? new Set(allIds) : new Set(prev);
        if (base.has(id)) base.delete(id);
        else base.add(id);
        return base;
      });
    },
    [allIds]
  );

  const setSelectedIds = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const selectAll = useCallback(() => setSelected(null), []);
  const clearAll = useCallback(() => setSelected(new Set<string>()), []);

  const toggleExcludedFromChampion = useCallback((id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value: CampaignsCtxValue = {
    campaigns,
    loading: isLoading,
    selectedIds,
    isAllSelected,
    effectiveCampaignIds,
    toggleSelected,
    setSelectedIds,
    selectAll,
    clearAll,
    excludedFromChampion: Array.from(excluded),
    isExcludedFromChampion: (id) => excluded.has(id),
    toggleExcludedFromChampion,
  };

  return <CampaignsCtx.Provider value={value}>{children}</CampaignsCtx.Provider>;
};
