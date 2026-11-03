import axios from "axios";
import type {
  Cart,
  Catalog,
  Filters,
  NFT,
  Session,
  User,
  Wallet,
  Quote,
  Order,
  OrderInput,
  Scenario,
} from "./contracts";
let sessionEpoch = 0;
export function bumpSessionEpoch() {
  sessionEpoch++;
}
export const http = axios.create({ baseURL: "/api", timeout: 8000, adapter: "fetch" });
http.interceptors.request.use((config) => {
  config.headers.set("X-Client-Generation", String(sessionEpoch));
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.headers?.["X-Client-Generation"] === String(sessionEpoch)
    )
      window.dispatchEvent(new Event("session-expired"));
    return Promise.reject(error);
  },
);
export const api = {
  catalog: async (filters: Filters, signal?: AbortSignal) =>
    (await http.get<Catalog>("/nfts", { params: filters, signal })).data,
  detail: async (id: string, signal?: AbortSignal) =>
    (await http.get<NFT>(`/nfts/${id}`, { signal })).data,
  cart: async (signal?: AbortSignal) =>
    (await http.get<Cart>("/cart", { signal })).data,
  updateCart: async (id: string, quantity: number) =>
    (await http.put<Cart>(`/cart/items/${id}`, { quantity })).data,
  coupon: async (code: string) =>
    (await http.put<Cart>("/cart/coupon", { code })).data,
  session: async () => (await http.get<Session>("/session")).data,
  login: async (email: string, password: string) =>
    (await http.post<Session>("/session", { email, password })).data,
  register: async (name: string, email: string, password: string) =>
    (await http.post<Session>("/accounts", { name, email, password })).data,
  logout: async () => {
    await http.delete("/session");
  },
  profile: async (data: {
    name: string;
    email: string;
    avatar: string;
    username?: string;
    ens?: string;
    walletLabel?: string;
  }) => (await http.patch<User>("/profile", data)).data,
  password: async (currentPassword: string, newPassword: string) => {
    await http.put("/profile/password", { currentPassword, newPassword });
  },
  wallets: async (signal?: AbortSignal) =>
    (await http.get<Wallet[]>("/wallets", { signal })).data,
  saveWallet: async (wallet: Omit<Wallet, "id"> & { id?: string }) =>
    (await http.put<Wallet[]>("/wallets", { ...wallet })).data,
  favorites: async (signal?: AbortSignal) =>
    (await http.get<string[]>("/favorites", { signal })).data,
  favorite: async (id: string, active: boolean) =>
    (await http.put<string[]>(`/favorites/${id}`, { active })).data,
  quote: async (signal?: AbortSignal) =>
    (await http.post<Quote>("/quotes", {}, { signal })).data,
  order: async (input: OrderInput, key: string) =>
    (
      await http.post<Order>("/orders", input, {
        headers: { "Idempotency-Key": key },
      })
    ).data,
  getOrder: async (id: string, signal?: AbortSignal) =>
    (await http.get<Order>(`/orders/${id}`, { signal })).data,
  scenarios: async () => (await http.get<Scenario>("/demo/scenario")).data,
  setScenario: async (patch: Partial<Scenario>) =>
    (await http.patch<Scenario>("/demo/scenario", patch)).data,
  demo: async (action: string, id?: string) =>
    (await http.post("/demo/actions", { action, id })).data,
};
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && ["ETIMEDOUT", "ECONNABORTED"].includes(error.code ?? "")) {
    return "O tempo de resposta esgotou. Tente novamente.";
  }
  return axios.isAxiosError(error)
    ? (error.response?.data?.message ??
        "Não foi possível conectar. Tente novamente.")
    : "Ocorreu um erro. Tente novamente.";
}
