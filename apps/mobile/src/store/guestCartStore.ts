import { create } from "zustand";
import type { CartItemDto, ProductDto } from "@ikaystores/shared";
import { CartApi } from "../api/endpoints";
import { secureStorage } from "./secureStorage";

const GUEST_CART_KEY = "ikaystores.guestCart";

interface GuestCartState {
  items: CartItemDto[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (product: ProductDto, quantity: number) => void;
  updateItem: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

async function persist(items: CartItemDto[]) {
  await secureStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export const useGuestCartStore = create<GuestCartState>((set, get) => ({
  items: [],
  isHydrated: false,

  hydrate: async () => {
    const stored = await secureStorage.getItem(GUEST_CART_KEY);
    set({ items: stored ? (JSON.parse(stored) as CartItemDto[]) : [], isHydrated: true });
  },

  addItem: (product, quantity) => {
    const existing = get().items.find((item) => item.productId === product.id);
    const items = existing
      ? get().items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      : [
          ...get().items,
          {
            id: product.id,
            productId: product.id,
            quantity,
            priceAtAdd: product.price,
            product,
          },
        ];
    set({ items });
    persist(items);
  },

  updateItem: (productId, quantity) => {
    const items = get().items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item,
    );
    set({ items });
    persist(items);
  },

  removeItem: (productId) => {
    const items = get().items.filter((item) => item.productId !== productId);
    set({ items });
    persist(items);
  },

  clear: () => {
    set({ items: [] });
    persist([]);
  },
}));

/**
 * Called right after a successful login/register: pushes whatever the guest
 * accumulated locally into the now-authenticated user's server-side cart.
 * Failures on individual items are swallowed so one bad item (e.g. a
 * product that went out of stock) doesn't block the rest from syncing.
 */
export async function syncGuestCartToServer(): Promise<void> {
  const { items, clear } = useGuestCartStore.getState();
  if (items.length === 0) return;

  await Promise.allSettled(
    items.map((item) => CartApi.addItem({ productId: item.productId, quantity: item.quantity })),
  );
  clear();
}
