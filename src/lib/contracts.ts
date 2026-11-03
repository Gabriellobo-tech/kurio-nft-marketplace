export type Category = "Arte" | "3D" | "Fotografia";
export interface NFT {
  parentId?: string;
  editions?: { id: string; label: string; price: string; available: number }[];
  galleryImage?: string;
  edition?: string;
  token?: string;
  collection?: string;
  rare?: boolean;
  description?: string;
  id: string;
  name: string;
  creator: string;
  category: Category;
  price: string;
  available: number;
  image: string;
  version: number;
}
export interface Filters {
  view?: "all" | "new" | "trending";
  favoriteOnly?: boolean;
  q: string;
  category: string;
  sort: "recent" | "price-asc" | "price-desc";
  page: number;
}
export interface Catalog {
  items: NFT[];
  total: number;
  pages: number;
}
export interface CartLine {
  nft: NFT;
  quantity: number;
}
export interface Cart {
  items: CartLine[];
  coupon: string;
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
}
export interface User {
  username?: string;
  ens?: string;
  walletLabel?: string;
  id: string;
  name: string;
  email: string;
  avatar: string;
}
export interface Session {
  user: User | null;
  expiresAt: number | null;
}
export type Network = "ethereum" | "polygon";
export interface Wallet {
  id: string;
  label: string;
  address: string;
  network: Network;
  primary: boolean;
}
export interface Quote extends Cart {
  id: string;
  expiresAt: number;
  fingerprint: string;
}
export interface Buyer {
  name: string;
  email: string;
}
export interface OrderInput {
  quoteId: string;
  walletId: string;
  network: Network;
  buyer: Buyer;
}
export interface Order {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "rejected";
  version: number;
  receipt: Quote;
  buyer: Buyer;
  wallet: Wallet;
  createdAt: number;
  transaction: string;
  reason?: string;
}
export interface ResourceEvent<T> {
  eventId: string;
  userId?: string;
  resourceId: string;
  version: number;
  data: T;
}
export interface Scenario {
  connectionError: boolean;
  variableLatency: boolean;
  latency: number;
  catalogError: boolean;
  favoriteError: boolean;
  timeoutOrder: boolean;
  payment: "confirmed" | "rejected";
  orderDelay: number;
}
export interface ApiError {
  message: string;
  fields?: Record<string, string>;
}
