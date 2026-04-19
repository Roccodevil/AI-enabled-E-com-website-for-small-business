import { createContext, useContext, useEffect, useState, ReactNode } from "react";

import { createProductApi, deleteProductApi, getProductsApi, updateProductApi } from "@/lib/api";
import type { Saree } from "@/types/saree";

type SareesCtx = {
  sarees: Saree[];
  loading: boolean;
  getSaree: (id: string) => Saree | undefined;
  createSaree: (s: Omit<Saree, "id">) => Promise<Saree>;
  updateSaree: (id: string, patch: Partial<Omit<Saree, "id">>) => Promise<void>;
  deleteSaree: (id: string) => Promise<void>;
  resetSarees: () => Promise<void>;
};

const Ctx = createContext<SareesCtx | null>(null);

export function SareesProvider({ children }: { children: ReactNode }) {
  const [sarees, setSarees] = useState<Saree[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const products = await getProductsApi();
      setSarees(products);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      void refresh(false);
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const getSaree = (id: string) => sarees.find((s) => s.id === id);

  const createSaree: SareesCtx["createSaree"] = async (s) => {
    const created = await createProductApi(s);
    setSarees((prev) => [created, ...prev]);
    return created;
  };

  const updateSaree: SareesCtx["updateSaree"] = async (id, patch) => {
    const updated = await updateProductApi(id, patch);
    setSarees((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const deleteSaree: SareesCtx["deleteSaree"] = async (id) => {
    await deleteProductApi(id);
    setSarees((prev) => prev.filter((s) => s.id !== id));
  };

  const resetSarees: SareesCtx["resetSarees"] = async () => {
    await refresh();
  };

  return (
    <Ctx.Provider value={{ sarees, loading, getSaree, createSaree, updateSaree, deleteSaree, resetSarees }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSarees() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSarees must be used within SareesProvider");
  return c;
}
