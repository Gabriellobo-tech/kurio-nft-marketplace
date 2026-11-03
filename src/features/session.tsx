import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, bumpSessionEpoch } from "../lib/api";
import type { Session } from "../lib/contracts";
import { queryClient } from "../lib/query";
export const sessionKey = ["session"] as const;
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: api.session,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}
export function useCart() {
  const session = useSession();
  const owner = session.data?.user?.id ?? "guest";
  return useQuery({
    queryKey: ["cart", owner],
    queryFn: ({ signal }) => api.cart(signal),
    enabled: session.isSuccess,
  });
}
export async function replaceSession(session: Session) {
  bumpSessionEpoch();
  await queryClient.cancelQueries();
  // Keep the active session Query instance: clearing it leaves mounted
  // observers attached to the removed record, so logout may not repaint.
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
  queryClient.setQueryData(sessionKey, session);
  await queryClient.invalidateQueries();
}
export function usePrivateKey(resource: string) {
  const s = useSession();
  return [resource, s.data?.user?.id ?? "guest"] as const;
}
export function useCartUpdater() {
  const key = usePrivateKey("cart");
  const q = useQueryClient();
  return (data: unknown) => q.setQueryData(key, data);
}
