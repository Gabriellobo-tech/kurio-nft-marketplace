import { hashPassword } from "./password";
export { hashPassword } from "./password";
import { randomId } from "../lib/id";
import { fixtures, editionFixtures } from "./fixtures";
import { fromWei, toWei, sumEth } from "../lib/money";
import type {
  NFT,
  User,
  Wallet,
  Quote,
  Order,
  Cart,
  Scenario,
} from "../lib/contracts";
interface Account extends User {
  salt: string;
  hash: string;
  favorites: string[];
  wallets: Wallet[];
}
interface Basket {
  items: Record<string, number>;
  coupon: string;
}
interface StoredOrder extends Order {
  dueAt: number;
  outcome: "confirmed" | "rejected";
}
export interface DB {
  version: 5;
  nfts: NFT[];
  users: Account[];
  session: { userId: string; expiresAt: number } | null;
  carts: Record<string, Basket>;
  quotes: Record<string, Quote & { userId: string }>;
  orders: Record<string, StoredOrder>;
  keys: Record<string, { orderId: string; body: string }>;
  scenario: Scenario;
}
const storage = "forma.mock.db.v2";
export const disconnectors = new Set<() => void>();
export const emitters = new Set<(name: string, data: unknown) => void>();
export function emit(name: string, data: unknown) {
  for (const f of emitters) f(name, data);
}
export const defaults: Scenario = {
  connectionError: false,
  variableLatency: false,
  latency: 180,
  catalogError: false,
  favoriteError: false,
  timeoutOrder: false,
  payment: "confirmed",
  orderDelay: 2500,
};
let current: DB;
export async function account(
  name: string,
  email: string,
  password: string,
): Promise<Account> {
  const salt = randomId();
  return {
    id: randomId(),
    name,
    email,
    avatar: "",
    salt,
    hash: await hashPassword(password, salt),
    favorites: [],
    wallets: [
      {
        id: randomId(),
        label: "Carteira principal simulada",
        address: "0x1111111111111111111111111111111111111111",
        network: "ethereum",
        primary: true,
      },
    ],
  };
}
export function publicUser(a: Account): User {
  const { id, name, email, avatar, username, ens, walletLabel } = a;
  return { id, name, email, avatar, username, ens, walletLabel };
}
export async function reset() {
  current = {
    version: 5,
    nfts: structuredClone([...fixtures, ...editionFixtures]),
    users: await Promise.all([
      account("Gabriel Demo", "gabriel@example.test", "Demo@12345"),
      account("Marina Demo", "marina@example.test", "Demo@12345"),
    ]),
    session: null,
    carts: {},
    quotes: {},
    orders: {},
    keys: {},
    scenario: { ...defaults },
  };
  save();
  return current;
}
export async function initialize() {
  try {
    const saved = JSON.parse(localStorage.getItem(storage) ?? "null");
    if (saved?.version === 2) {
      saved.version = 3;
      saved.nfts = saved.nfts.map((old: NFT) => ({
        ...old,
        ...fixtures.find((n) => n.id === old.id),
        available: old.available,
        version: old.version + 1,
      }));
    }
    if (saved?.version === 3) {
      saved.version = 4;
      const existing = new Set(saved.nfts.map((n: NFT) => n.id));
      saved.nfts.push(
        ...structuredClone(editionFixtures.filter((n) => !existing.has(n.id))),
      );
    }
    if (saved?.version === 4) {
      saved.version = 5;
      const existing = new Set(saved.nfts.map((n: NFT) => n.id));
      saved.nfts.push(...structuredClone(editionFixtures.filter((n) => !existing.has(n.id))));
      for (const nft of saved.nfts as NFT[]) {
        if (nft.edition?.toUpperCase() === "ABERTA") nft.edition = "ABERTA";
        if (nft.edition === "1/1" && nft.available > 1) {
          nft.available = 1;
          nft.version++;
        }
      }
    }
    if (saved?.version === 5) {
      current = saved;
      current.scenario = { ...defaults, ...current.scenario };
      save();
      return;
    }
  } catch {
    /* reset invalid mock state */
  }
  await reset();
}
export function db() {
  return current;
}
export function save() {
  localStorage.setItem(storage, JSON.stringify(current));
}
export function user() {
  const s = current.session;
  if (!s || s.expiresAt <= Date.now()) return null;
  return current.users.find((u) => u.id === s.userId) ?? null;
}
export function basket(owner = user()?.id ?? "guest"): Basket {
  return (
    current.carts[owner] ?? (current.carts[owner] = { items: {}, coupon: "" })
  );
}
export function cart(owner = user()?.id ?? "guest"): Cart {
  const b = basket(owner);
  const items = current.nfts
    .filter((n) => b.items[n.id] > 0)
    .map((nft) => ({ nft: structuredClone(nft), quantity: b.items[nft.id] }));
  const subtotal = sumEth(
    items.map((l) => ({ price: l.nft.price, quantity: l.quantity })),
  );
  const discount =
    b.coupon === "FORMA10" ? fromWei(toWei(subtotal) / 10n) : "0";
  const networkFee = items.length ? "0.0042" : "0";
  return {
    items,
    coupon: b.coupon,
    subtotal,
    discount,
    networkFee,
    total: fromWei(toWei(subtotal) - toWei(discount) + toWei(networkFee)),
  };
}
export function fingerprint(c: Cart) {
  return JSON.stringify([
    c.items.map((l) => [
      l.nft.id,
      l.nft.version,
      l.nft.price,
      l.nft.available,
      l.quantity,
    ]),
    c.coupon,
    c.total,
  ]);
}
export function makeQuote(): Quote {
  const u = user()!;
  const c = cart(u.id);
  const quote = {
    ...c,
    id: randomId(),
    expiresAt: Date.now() + 120000,
    fingerprint: fingerprint(c),
  };
  current.quotes[quote.id] = { ...quote, userId: u.id };
  save();
  return quote;
}
export function mergeGuest(id: string) {
  const guest = basket("guest"),
    target = basket(id);
  for (const [key, qty] of Object.entries(guest.items)) {
    const n = current.nfts.find((n) => n.id === key);
    if (n)
      target.items[key] = Math.min(n.available, (target.items[key] ?? 0) + qty);
  }
  if (!target.coupon) target.coupon = guest.coupon;
  current.carts.guest = { items: {}, coupon: "" };
  save();
}
export function nftEvent(nft: NFT) {
  emit("nft.updated", {
    eventId: randomId(),
    resourceId: nft.id,
    version: nft.version,
    data: nft,
  });
}
export function orderEvent(order: Order) {
  emit("order.updated", {
    eventId: randomId(),
    resourceId: order.id,
    userId: order.userId,
    version: order.version,
    data: order,
  });
}
export function settleOrders() {
  for (const order of Object.values(current.orders)) {
    if (order.status !== "pending" || Date.now() < order.dueAt) continue;
    order.status = order.outcome;
    order.version++;
    if (order.status === "confirmed") {
      const b = basket(order.userId);
      for (const l of order.receipt.items) {
        b.items[l.nft.id] = Math.max(0, (b.items[l.nft.id] ?? 0) - l.quantity);
      }
      b.coupon = "";
    } else {
      order.reason =
        "O pagamento foi recusado na simulação. Seus itens foram preservados.";
      for (const l of order.receipt.items) {
        const nft = current.nfts.find((n) => n.id === l.nft.id)!;
        nft.available += l.quantity;
        nft.version++;
        nftEvent(nft);
      }
    }
    save();
    orderEvent(order);
  }
}
