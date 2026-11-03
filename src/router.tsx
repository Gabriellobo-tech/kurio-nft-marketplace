import { lazy, Suspense } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import {
  Layout,
  CatalogPage,
  DetailPage,
  CartPage,
  Missing,
  Failure,
} from "./views";
import { api } from "./lib/api";
import { safeReturn } from "./lib/return";
const AuthPage = lazy(() =>
  import("./features/account-pages").then((m) => ({ default: m.AuthPage })),
);
const ProfilePage = lazy(() =>
  import("./features/account-pages").then((m) => ({ default: m.ProfilePage })),
);
const WalletsPage = lazy(() =>
  import("./features/account-pages").then((m) => ({ default: m.WalletsPage })),
);
const CheckoutPage = lazy(() =>
  import("./features/checkout-pages").then((m) => ({
    default: m.CheckoutPage,
  })),
);
const OrderPage = lazy(() =>
  import("./features/checkout-pages").then((m) => ({ default: m.OrderPage })),
);
const DemoPage = lazy(() =>
  import("./features/demo-page").then((m) => ({ default: m.DemoPage })),
);
import type { Filters } from "./lib/contracts";
const root = createRootRoute({
  component: () => (
    <Layout>
      <Suspense
        fallback={
          <div className="empty skeleton" aria-busy="true">
            Carregando página…
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </Layout>
  ),
  notFoundComponent: Missing,
  errorComponent: ({ error, reset }) => <Failure error={error} retry={reset} />,
});
const validateCatalogSearch = (s: Record<string, unknown>): Filters => ({
  q: typeof s.q === "string" ? s.q : "",
  view: s.view === "new" || s.view === "trending" ? s.view : "all",
  category: ["Arte", "3D", "Fotografia"].includes(String(s.category))
    ? String(s.category)
    : "",
  sort: s.sort === "price-asc" || s.sort === "price-desc" ? s.sort : "recent",
  page:
    Number.isInteger(Number(s.page)) && Number(s.page) > 0 ? Number(s.page) : 1,
});
const index = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: DetailPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: CartPage,
});
const authSearch = (s: Record<string, unknown>) => ({
  redirect: safeReturn(s.redirect),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: authSearch,
  component: () => <AuthPage />,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/register",
  validateSearch: authSearch,
  component: () => <AuthPage register />,
});
async function protect(location: { href: string }) {
  const session = await api.session();
  if (!session.user)
    throw redirect({ to: "/login", search: { redirect: location.href } });
}
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favorites",
  beforeLoad: ({ location }) => protect(location),
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  beforeLoad: ({ location }) => protect(location),
  component: ProfilePage,
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  beforeLoad: ({ location }) => protect(location),
  component: WalletsPage,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  beforeLoad: ({ location }) => protect(location),
  component: CheckoutPage,
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/orders/$id",
  beforeLoad: ({ location }) => protect(location),
  component: OrderPage,
});
const demo = createRoute({
  getParentRoute: () => root,
  path: "/demo",
  component: DemoPage,
});
export const router = createRouter({
  routeTree: root.addChildren([
    index,
    favorites,
    detail,
    cart,
    login,
    register,
    profile,
    wallets,
    checkout,
    order,
    demo,
  ]),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
