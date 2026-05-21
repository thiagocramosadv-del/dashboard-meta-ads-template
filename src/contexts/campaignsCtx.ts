import { createContext, useContext } from "react";

export interface Campaign {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
}

export interface CampaignsCtxValue {
  campaigns: Campaign[];
  loading: boolean;
  selectedIds: string[];
  isAllSelected: boolean;
  effectiveCampaignIds: string[];
  toggleSelected: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  clearAll: () => void;
  excludedFromChampion: string[];
  isExcludedFromChampion: (id: string) => boolean;
  toggleExcludedFromChampion: (id: string) => void;
}

export const CampaignsCtx = createContext<CampaignsCtxValue | null>(null);

export const useCampaigns = () => {
  const ctx = useContext(CampaignsCtx);
  if (!ctx) throw new Error("useCampaigns precisa estar dentro de CampaignsProvider");
  return ctx;
};
