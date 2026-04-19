import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

import { quotePriceApi } from "@/lib/api";
import { useSarees } from "@/context/SareesContext";

export type CartItem = {
  id: string;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (id: string, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  lineTotal: (id: string) => number;
  unitPriceFor: (id: string) => number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "silkroute_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { sarees } = useSarees();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as CartItem[];
    } catch {
      // noop
    }
    return [];
  });
  const [unitPriceMap, setUnitPriceMap] = useState<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    setItems((prev) => prev.filter((i) => sarees.some((s) => s.id === i.id)));
  }, [sarees]);

  useEffect(() => {
    let cancelled = false;

    const fetchQuotes = async () => {
      const next: Record<string, number> = {};
      for (const item of items) {
        const product = sarees.find((s) => s.id === item.id);
        if (!product) continue;
        try {
          next[item.id] = await quotePriceApi(item.id, item.quantity);
        } catch {
          next[item.id] = product.basePrice;
        }
      }
      if (!cancelled) setUnitPriceMap(next);
    };

    void fetchQuotes();
    return () => {
      cancelled = true;
    };
  }, [items, sarees]);

  const addItem = (id: string, quantity = 1) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(500, i.quantity + quantity) } : i));
      }
      return [...prev, { id, quantity }];
    });

  const updateQuantity = (id: string, quantity: number) =>
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(500, quantity) } : i))
    );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const unitPriceFor = (id: string) => {
    if (unitPriceMap[id] !== undefined) return unitPriceMap[id];
    return sarees.find((x) => x.id === id)?.basePrice ?? 0;
  };

  const lineTotal = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return 0;
    return unitPriceFor(id) * item.quantity;
  };

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let sub = 0;
    for (const i of items) {
      c += i.quantity;
      sub += lineTotal(i.id);
    }
    return { count: c, subtotal: sub };
  }, [items, unitPriceMap, sarees]);

  return (
    <Ctx.Provider value={{ items, count, subtotal, addItem, updateQuantity, removeItem, clearCart, lineTotal, unitPriceFor }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
