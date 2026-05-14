import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'ww_shopping_cart_v1';

export type CartSubjectType = 'product';

export type CartLine = {
  subject_type: CartSubjectType;
  subject_id: number;
  title: string;
  image_url: string | null;
  unit_price: string | null;
  currency: string;
  quantity: number;
};

function lineKey(line: Pick<CartLine, 'subject_type' | 'subject_id'>): string {
  return `${line.subject_type}:${line.subject_id}`;
}

function parseAmount(amount: string | null): number {
  if (amount == null || amount === '') return 0;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

type Ctx = {
  lines: CartLine[];
  lineCount: number;
  /** Total units (sum of quantities). */
  unitCount: number;
  /** Per ISO currency code. */
  subtotals: Record<string, number>;
  addProduct: (input: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setLineQuantity: (subjectType: CartSubjectType, subjectId: number, quantity: number) => void;
  removeLine: (subjectType: CartSubjectType, subjectId: number) => void;
  clearCart: () => void;
  ready: boolean;
};

const ShoppingCartContext = createContext<Ctx | null>(null);

export function ShoppingCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            const cleaned: CartLine[] = [];
            for (const item of parsed) {
              if (!item || typeof item !== 'object') continue;
              const o = item as Record<string, unknown>;
              if (o.subject_type !== 'product') continue;
              const id = Math.floor(Number(o.subject_id));
              if (!Number.isFinite(id) || id <= 0) continue;
              const qty = Math.max(1, Math.min(99, Math.floor(Number(o.quantity) || 1)));
              cleaned.push({
                subject_type: 'product',
                subject_id: id,
                title: String(o.title ?? 'Product'),
                image_url: typeof o.image_url === 'string' ? o.image_url : null,
                unit_price: typeof o.unit_price === 'string' ? o.unit_price : null,
                currency: typeof o.currency === 'string' && o.currency ? o.currency : 'USD',
                quantity: qty,
              });
            }
            setLines(cleaned);
          }
        }
      } catch {
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: CartLine[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addProduct = useCallback(
    (input: Omit<CartLine, 'quantity'> & { quantity?: number }) => {
      const qtyIn = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));
      setLines((prev) => {
        const key = lineKey(input);
        let found = false;
        const next = prev.map((l) => {
          if (lineKey(l) !== key) return l;
          found = true;
          const q = Math.min(99, l.quantity + qtyIn);
          return { ...l, quantity: q };
        });
        if (!found) {
          next.push({
            subject_type: 'product',
            subject_id: input.subject_id,
            title: input.title,
            image_url: input.image_url,
            unit_price: input.unit_price,
            currency: input.currency || 'USD',
            quantity: qtyIn,
          });
        }
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const setLineQuantity = useCallback(
    (subjectType: CartSubjectType, subjectId: number, quantity: number) => {
      const q = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
      setLines((prev) => {
        const next = prev
          .map((l) => (lineKey(l) === lineKey({ subject_type: subjectType, subject_id: subjectId }) ? { ...l, quantity: q } : l))
          .filter((l) => l.quantity > 0);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeLine = useCallback(
    (subjectType: CartSubjectType, subjectId: number) => {
      setLines((prev) => {
        const next = prev.filter((l) => lineKey(l) !== lineKey({ subject_type: subjectType, subject_id: subjectId }));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearCart = useCallback(() => {
    setLines([]);
    void persist([]);
  }, [persist]);

  const { lineCount, unitCount, subtotals } = useMemo(() => {
    let unitCount = 0;
    const subtotals: Record<string, number> = {};
    for (const l of lines) {
      unitCount += l.quantity;
      const cur = l.currency || 'USD';
      subtotals[cur] = (subtotals[cur] ?? 0) + parseAmount(l.unit_price) * l.quantity;
    }
    return { lineCount: lines.length, unitCount, subtotals };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      lineCount,
      unitCount,
      subtotals,
      addProduct,
      setLineQuantity,
      removeLine,
      clearCart,
      ready,
    }),
    [lines, lineCount, unitCount, subtotals, addProduct, setLineQuantity, removeLine, clearCart, ready]
  );

  return <ShoppingCartContext.Provider value={value}>{children}</ShoppingCartContext.Provider>;
}

export function useShoppingCart(): Ctx {
  const c = useContext(ShoppingCartContext);
  if (!c) {
    throw new Error('useShoppingCart must be used within ShoppingCartProvider');
  }
  return c;
}
