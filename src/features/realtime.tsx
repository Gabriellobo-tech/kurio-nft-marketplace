import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bumpSessionEpoch } from "../lib/api";
import { useSession, replaceSession } from "./session";
import type { NFT, Order, ResourceEvent } from "../lib/contracts";
export function Realtime() {
  const session = useSession();
  const owner = session.data?.user?.id;
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(false);
  const previousOwner = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!session.isSuccess) return;
    const previous = previousOwner.current;
    const next = owner ?? null;
    if (previous !== undefined && previous !== next) {
      bumpSessionEpoch();
      if (previous) {
        const privateData = (q: { queryKey: readonly unknown[] }) =>
          [
            "cart",
            "wallets",
            "favorites",
            "quote",
            "order",
            "profile",
            "nfts",
          ].includes(String(q.queryKey[0])) && q.queryKey[1] === previous;
        void client.cancelQueries({ predicate: privateData });
        client.removeQueries({ predicate: privateData });
      }
    }
    previousOwner.current = next;
  }, [owner, session.isSuccess, client]);
  useEffect(() => {
    const expire = () => {
      void replaceSession({ user: null, expiresAt: null });
      setNotice("Sua sessão expirou. Entre novamente para retomar.");
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (!session.isSuccess) return;
    setOnline(false);
    const versions = new Map<string, number>();
    let active = true;
    let socket: import("socket.io-client").Socket | undefined;
    void import("socket.io-client").then(({ io }) => {
      if (!active) return;
      socket = io(location.origin, {
        path: "/socket.io",
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 500,
      });
      let connectedOnce = false;
      const reconcile = () => {
        if (!active) return;
        setOnline(true);
        if (connectedOnce)
          setNotice("Conexão restabelecida. Dados reconciliados com a API.");
        connectedOnce = true;
        socket!.emit("subscribe", { userId: owner });
        void client.invalidateQueries({
          predicate: (q) =>
            ["nfts", "nft", "cart", "order", "quote", "session"].includes(
              String(q.queryKey[0]),
            ),
        });
      };
      socket.on("connect", reconcile);
      socket.on("connect_error", (error) => {
        if (active) setNotice(`Tempo real indisponível: ${error.message}.`);
      });
      socket.on("disconnect", () => {
        if (active) {
          setOnline(false);
          setNotice(
            "Conexão interrompida. Os pedidos continuam sendo consultados pela API.",
          );
        }
      });
      socket.on("nft.updated", (event: ResourceEvent<NFT>) => {
        if (!active) return;
        const key = `nft:${event.resourceId}`;
        const cached = client.getQueryData<NFT>(["nft", event.resourceId]);
        if (
          event.version <=
          Math.max(versions.get(key) ?? 0, cached?.version ?? 0)
        )
          return;
        versions.set(key, event.version);
        client.setQueryData<NFT>(["nft", event.resourceId], (old) => ({
          ...old,
          ...event.data,
          editions: old?.editions,
        }));
        void client.invalidateQueries({
          predicate: (q) =>
            ["nfts", "nft", "cart", "quote"].includes(String(q.queryKey[0])),
        });
        setNotice(
          "Preço ou disponibilidade alterados. Confira os valores antes de comprar.",
        );
      });
      socket.on("order.updated", (event: ResourceEvent<Order>) => {
        if (!active || event.userId !== owner) return;
        const key = ["order", owner, event.resourceId];
        const cached = client.getQueryData<Order>(key);
        if (
          event.version <= (cached?.version ?? 0) ||
          event.version <= (versions.get(event.resourceId) ?? 0) ||
          cached?.status === "confirmed" ||
          cached?.status === "rejected"
        )
          return;
        versions.set(event.resourceId, event.version);
        client.setQueryData(key, event.data);
        void client.invalidateQueries({ queryKey: ["cart", owner] });
        setNotice(
          event.data.status === "confirmed"
            ? "Pedido confirmado."
            : event.data.status === "rejected"
              ? "Pagamento recusado."
              : "Pedido em processamento.",
        );
      });
    });
    return () => {
      active = false;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [owner, session.isSuccess, client]);
  return (
    <div className="realtime-bar">
      <span className={online ? "connection-online" : ""}>
        {online ? "● Tempo real conectado" : "○ Conectando tempo real"}
      </span>
      <span role="status" aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
