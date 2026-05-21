// Per-page persisted multi-select of campaigns. Independent of the global
// CampaignsContext (used by Visão Geral). Uses localStorage for persistence
// and a tiny pub/sub so multiple components on the same page (e.g. the
// AppLayout filter and the page itself) stay in sync.

export type Scope = "criativos" | "conjuntos";

const STORAGE_KEYS: Record<Scope, string> = {
  criativos: "santosads.selectedCampaigns.criativos",
  conjuntos: "santosads.selectedCampaigns.conjuntos",
};

// `null` = "selecionar todas" (default)
type State = Set<string> | null;

const stores: Record<Scope, State> = {
  criativos: read("criativos"),
  conjuntos: read("conjuntos"),
};
const listeners: Record<Scope, Set<() => void>> = {
  criativos: new Set(),
  conjuntos: new Set(),
};

function read(scope: Scope): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[scope]);
    if (raw === null) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return new Set(arr.map(String));
  } catch {
    return null;
  }
}

function write(scope: Scope, state: State) {
  try {
    if (state === null) localStorage.removeItem(STORAGE_KEYS[scope]);
    else localStorage.setItem(STORAGE_KEYS[scope], JSON.stringify(Array.from(state)));
  } catch {
    /* noop */
  }
}

export function getSelection(scope: Scope): State {
  return stores[scope];
}

export function setSelection(scope: Scope, state: State) {
  stores[scope] = state;
  write(scope, state);
  listeners[scope].forEach((cb) => cb());
}

export function subscribe(scope: Scope, cb: () => void) {
  listeners[scope].add(cb);
  return () => {
    listeners[scope].delete(cb);
  };
}

export function toggle(scope: Scope, id: string, allIds: string[]) {
  const current = stores[scope] ?? new Set(allIds);
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setSelection(scope, next);
}

export function selectAll(scope: Scope) {
  setSelection(scope, null);
}

export function clearAll(scope: Scope) {
  setSelection(scope, new Set<string>());
}
