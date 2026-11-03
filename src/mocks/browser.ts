import { randomId } from "../lib/id";
import { setupWorker } from "msw/browser";
import { http, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { OrderInput, Wallet } from "../lib/contracts";
import { toWei, fromWei } from "../lib/money";
import {
  db,
  save,
  user,
  initialize,
  reset,
  account,
  hashPassword,
  publicUser,
  basket,
  cart,
  makeQuote,
  fingerprint,
  mergeGuest,
  settleOrders,
  nftEvent,
  orderEvent,
  emitters,
  emit,
  disconnectors,
} from "./database";
const err = (message: string, status = 422) =>
  HttpResponse.json({ message }, { status });
const denied = () =>
  err("Sua sessão expirou. Entre novamente para continuar.", 401);
const emailOK = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
async function wait(request?: Request) {
  const scenario = db().scenario;
  const q = request ? (new URL(request.url).searchParams.get("q") ?? "") : "";
  await delay(
    scenario.latency +
      (scenario.variableLatency && request
        ? Math.max(0, 1000 - q.length * 180)
        : 0),
  );
  settleOrders();
}
// A root matcher also supports MSW versions that normalize /socket.io/ to /.
const socket = ws.link(
  new RegExp(
    `^${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(?:socket[.]io/)?(?:[?].*)?$`,
  ),
);
export const worker = setupWorker(
  http.all("/api/*", ({ request }) => {
    if (
      !new URL(request.url).pathname.startsWith("/api/demo/") &&
      db().scenario.connectionError
    )
      return HttpResponse.error();
    return undefined;
  }),
  socket.addEventListener("connection", (connection) => {
    if (!connection.client.url.pathname.startsWith("/socket.io/")) {
      connection.server.connect();
      return;
    }
    const io = toSocketIo(connection);
    let owner: string | null = null;
    io.client.on("subscribe", (_event, payload) => {
      const data = payload as { userId?: string };
      owner = user()?.id === data.userId ? data.userId! : null;
    });
    const send = (name: string, payload: unknown) => {
      const data = payload as { userId?: string };
      if (!data.userId || (data.userId === owner && user()?.id === owner))
        io.client.emit(name, payload);
    };
    const disconnect = () =>
      connection.client.close(4000, "Interrupção simulada");
    disconnectors.add(disconnect);
    emitters.add(send);
    const heartbeat = setInterval(() => connection.client.send("2"), 20000);
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      emitters.delete(send);
      disconnectors.delete(disconnect);
    });
  }),
  http.get("/api/session", async () => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    return HttpResponse.json({
      user: u ? publicUser(u) : null,
      expiresAt: u ? db().session!.expiresAt : null,
    });
  }),
  http.post("/api/session", async ({ request }) => {
    await wait();
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    const u = db().users.find(
      (u) => u.email.toLowerCase() === email?.trim().toLowerCase(),
    );
    if (!u || (await hashPassword(password ?? "", u.salt)) !== u.hash)
      return err("E-mail ou senha incorretos.", 401);
    db().session = { userId: u.id, expiresAt: Date.now() + 30 * 60000 };
    mergeGuest(u.id);
    save();
    return HttpResponse.json({
      user: publicUser(u),
      expiresAt: db().session!.expiresAt,
    });
  }),
  http.post("/api/accounts", async ({ request }) => {
    await wait();
    const { name, email, password } = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };
    if (
      !name?.trim() ||
      !emailOK(email ?? "") ||
      !password ||
      password.length < 8
    )
      return err(
        "Informe nome, e-mail válido e senha com pelo menos 8 caracteres.",
      );
    if (
      db().users.some(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      )
    )
      return err("Já existe uma conta com esse e-mail.", 409);
    const u = await account(name.trim(), email.trim().toLowerCase(), password);
    db().users.push(u);
    db().session = { userId: u.id, expiresAt: Date.now() + 30 * 60000 };
    mergeGuest(u.id);
    save();
    return HttpResponse.json(
      { user: publicUser(u), expiresAt: db().session!.expiresAt },
      { status: 201 },
    );
  }),
  http.delete("/api/session", async () => {
    await wait();
    db().session = null;
    save();
    return new HttpResponse(null, { status: 204 });
  }),
  http.patch("/api/profile", async ({ request }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    const { name, email, avatar, username, ens, walletLabel } =
      (await request.json()) as {
        name: string;
        email: string;
        avatar: string;
        username?: string;
        ens?: string;
        walletLabel?: string;
      };
    if (!name?.trim() || !emailOK(email ?? ""))
      return err("Informe nome e e-mail válidos.");
    if (
      avatar &&
      (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar) ||
        avatar.length > 550000)
    )
      return err("Avatar inválido. Use PNG, JPEG ou WebP de até 400 KB.");
    if (
      db().users.some(
        (x) => x.id !== u.id && x.email.toLowerCase() === email.toLowerCase(),
      )
    )
      return err("Esse e-mail já está em uso.", 409);
    if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return err(
        "O nome de usuário deve ter entre 3 e 30 letras, números ou sublinhados.",
      );
    if (ens && !/^[a-z0-9-]+[.]eth$/i.test(ens))
      return err("Informe um nome ENS terminado em .eth ou deixe em branco.");
    if (walletLabel && walletLabel.length > 60)
      return err("O apelido da carteira deve ter até 60 caracteres.");
    Object.assign(u, {
      username: username?.trim(),
      ens: ens?.trim().toLowerCase(),
      walletLabel: walletLabel?.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar,
    });
    save();
    return HttpResponse.json(publicUser(u));
  }),
  http.put("/api/profile/password", async ({ request }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
    };
    if ((await hashPassword(currentPassword ?? "", u.salt)) !== u.hash)
      return err("A senha atual está incorreta.");
    if (!newPassword || newPassword.length < 8)
      return err("A nova senha deve ter ao menos 8 caracteres.");
    u.salt = randomId();
    u.hash = await hashPassword(newPassword, u.salt);
    save();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("/api/wallets", async () => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    return u ? HttpResponse.json(u.wallets) : denied();
  }),
  http.put("/api/wallets", async ({ request }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    const w = (await request.json()) as Wallet;
    if (
      !w.label?.trim() ||
      !/^0x[\da-fA-F]{40}$/.test(w.address) ||
      !["ethereum", "polygon"].includes(w.network)
    )
      return err(
        "Informe nome, rede e endereço 0x com 40 caracteres hexadecimais.",
      );
    const existing = u.wallets.find((x) => x.id === w.id);
    if (w.id && !existing) return err("Carteira não encontrada.", 404);
    if (!existing && u.wallets.length >= 2)
      return err("São permitidas até duas carteiras.", 409);
    if (
      u.wallets.some(
        (x) =>
          x.id !== w.id && x.address.toLowerCase() === w.address.toLowerCase(),
      )
    )
      return err("Esta carteira já está cadastrada.", 409);
    if (w.primary) u.wallets.forEach((x) => (x.primary = false));
    const record = {
      id: existing?.id ?? randomId(),
      label: w.label.trim(),
      address: w.address,
      network: w.network,
      primary: w.primary || u.wallets.length === 0,
    };
    if (existing) Object.assign(existing, record);
    else u.wallets.push(record);
    if (!u.wallets.some((x) => x.primary)) u.wallets[0].primary = true;
    save();
    return HttpResponse.json(u.wallets);
  }),
  http.get("/api/favorites", async () => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    return u ? HttpResponse.json(u.favorites) : denied();
  }),
  http.put("/api/favorites/:id", async ({ params, request }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    if (db().scenario.favoriteError)
      return err("Falha simulada ao salvar favorito. Tente novamente.", 503);
    const id = String(params.id);
    if (!db().nfts.some((n) => n.id === id))
      return err("NFT não encontrado.", 404);
    const { active } = (await request.json()) as { active: boolean };
    u.favorites = u.favorites.filter((x) => x !== id);
    if (active) u.favorites.push(id);
    save();
    return HttpResponse.json(u.favorites);
  }),
  http.get("/api/nfts", async ({ request }) => {
    const p = new URL(request.url).searchParams;
    await wait(request);
    if (db().scenario.catalogError)
      return err("Catálogo indisponível no cenário atual.", 503);
    let items = db()
      .nfts.filter((n) => !n.parentId)
      .filter(
        (n) =>
          n.name.toLowerCase().includes((p.get("q") ?? "").toLowerCase()) &&
          (!p.get("category") || n.category === p.get("category")),
      );
    if (p.get("favoriteOnly") === "true") {
      const owner = user();
      if (!owner) return denied();
      items = items.filter((n) => owner.favorites.includes(n.id));
    }
    if (p.get("view") === "new")
      items = items.filter((n) => Number(n.id.split("-")[1]) > 12);
    if (p.get("view") === "trending")
      items = items.filter((n) => Number(n.id.split("-")[1]) % 3 === 1);
    const sort = p.get("sort");
    if (sort?.startsWith("price"))
      items = [...items].sort((a, b) => {
        const x = toWei(a.price),
          y = toWei(b.price);
        return (x < y ? -1 : x > y ? 1 : 0) * (sort === "price-asc" ? 1 : -1);
      });
    const page = Math.max(1, Number(p.get("page")) || 1);
    return HttpResponse.json({
      items: items.slice((page - 1) * 9, page * 9),
      total: items.length,
      pages: Math.ceil(items.length / 9),
    });
  }),
  http.get("/api/nfts/:id", async ({ params }) => {
    await wait();
    const nft = db().nfts.find((n) => n.id === params.id);
    if (!nft) return err("NFT não encontrado.", 404);
    const familyId = nft.parentId ?? nft.id;
    const family = db().nfts.filter((n) => n.id === familyId || n.parentId === familyId);
    // Legacy duplicate editions remain addressable for persisted carts/orders.
    // Prefer the selected record, then the original base record, in the chooser.
    family.sort((a, b) => Number(b.id === nft.id) - Number(a.id === nft.id) || Number(b.id === familyId) - Number(a.id === familyId));
    const unique = new Map<string, typeof nft>();
    for (const item of family) {
      const label = item.edition ?? "1/50";
      if (!unique.has(label)) unique.set(label, item);
    }
    const labels = ["1/1", "1/10", "1/50", "ABERTA"];
    const editions = [...unique.values()]
      .sort((a,b) => labels.indexOf(a.edition ?? "1/50") - labels.indexOf(b.edition ?? "1/50"))
      .map((n) => ({id:n.id, label:n.edition ?? "1/50", price:n.price, available:n.available}));
    return HttpResponse.json({ ...nft, editions });
  }),
  http.get("/api/cart", async () => {
    const owner = user()?.id ?? "guest";
    await wait();
    if (owner !== (user()?.id ?? "guest")) return denied();
    return HttpResponse.json(cart(owner));
  }),
  http.put("/api/cart/items/:id", async ({ params, request }) => {
    const owner = user()?.id;
    await wait();
    if (owner !== user()?.id) return denied();
    const nft = db().nfts.find((n) => n.id === params.id);
    if (!nft) return err("NFT não encontrado.", 404);
    const { quantity } = (await request.json()) as { quantity: number };
    if (!Number.isInteger(quantity) || quantity < 0)
      return err("Quantidade inválida.");
    if (quantity > nft.available)
      return err("Quantidade superior à disponibilidade.", 409);
    const items = basket().items;
    if (quantity) items[nft.id] = quantity;
    else delete items[nft.id];
    save();
    return HttpResponse.json(cart());
  }),
  http.put("/api/cart/coupon", async ({ request }) => {
    const owner = user()?.id;
    await wait();
    if (owner !== user()?.id) return denied();
    const { code } = (await request.json()) as { code: string };
    const normalized = code.trim().toUpperCase();
    if (normalized === "EXPIRADO") return err("Este cupom expirou.", 409);
    if (normalized && normalized !== "FORMA10") return err("Cupom inválido.");
    basket().coupon = normalized;
    save();
    return HttpResponse.json(cart());
  }),
  http.post("/api/quotes", async () => {
    const owner = user()?.id;
    await wait();
    if (!user() || owner !== user()?.id) return denied();
    const c = cart();
    if (!c.items.length) return err("Seu carrinho está vazio.", 409);
    if (c.items.some((l) => l.quantity > l.nft.available))
      return err(
        "Uma edição esgotou ou a quantidade disponível mudou. Ajuste seu carrinho.",
        409,
      );
    return HttpResponse.json(makeQuote());
  }),
  http.post("/api/orders", async ({ request }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    const input = (await request.json()) as OrderInput;
    const key = request.headers.get("Idempotency-Key");
    if (!key) return err("Chave de idempotência obrigatória.");
    const scoped = `${u.id}:${key}`;
    const body = JSON.stringify({
      quoteId: input.quoteId,
      walletId: input.walletId,
      network: input.network,
      buyer: { name: input.buyer?.name, email: input.buyer?.email },
    });
    const prior = db().keys[scoped];
    if (prior)
      return prior.body === body
        ? HttpResponse.json(db().orders[prior.orderId])
        : err("Chave reutilizada com conteúdo diferente.", 409);
    const quote = db().quotes[input.quoteId];
    if (!quote || quote.userId !== u.id)
      return err("Cotação não encontrada.", 404);
    if (
      quote.expiresAt <= Date.now() ||
      quote.fingerprint !== fingerprint(cart())
    )
      return err(
        "A cotação mudou ou expirou. Revise os valores e confirme novamente.",
        409,
      );
    const wallet = u.wallets.find((w) => w.id === input.walletId);
    if (!wallet || wallet.network !== input.network)
      return err("Selecione uma carteira e sua rede cadastrada.");
    if (!input.buyer?.name?.trim() || !emailOK(input.buyer?.email ?? ""))
      return err("Dados do colecionador inválidos.");
    const id = randomId();
    const order = {
      id,
      userId: u.id,
      status: "pending" as const,
      version: 1,
      receipt: structuredClone(quote),
      buyer: input.buyer,
      wallet: structuredClone(wallet),
      createdAt: Date.now(),
      transaction: `sim-${randomId()}`,
      dueAt: Date.now() + db().scenario.orderDelay,
      outcome: db().scenario.payment,
    };
    db().orders[id] = order;
    db().keys[scoped] = { body, orderId: id };
    for (const l of quote.items) {
      const nft = db().nfts.find((n) => n.id === l.nft.id)!;
      nft.available -= l.quantity;
      nft.version++;
      nftEvent(nft);
    }
    save();
    orderEvent(order);
    setTimeout(settleOrders, db().scenario.orderDelay + 10);
    if (db().scenario.timeoutOrder) {
      await delay(8500);
    }
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get("/api/orders/:id", async ({ params }) => {
    const startedAs = user()?.id;
    await wait();
    const u = user();
    if (startedAs !== u?.id) return denied();
    if (!u) return denied();
    const o = db().orders[String(params.id)];
    if (!o) return err("Pedido não encontrado.", 404);
    if (o.userId !== u.id)
      return err("Você não tem acesso a este pedido.", 403);
    return HttpResponse.json(o);
  }),
  http.get("/api/demo/scenario", () => HttpResponse.json(db().scenario)),
  http.patch("/api/demo/scenario", async ({ request }) => {
    const patch = (await request.json()) as Partial<
      ReturnType<typeof db>["scenario"]
    >;
    const s = db().scenario;
    if (typeof patch.latency === "number")
      s.latency = Math.max(0, Math.min(12000, patch.latency));
    for (const k of ["connectionError", "variableLatency", "catalogError", "favoriteError", "timeoutOrder"] as const)
      if (typeof patch[k] === "boolean") s[k] = patch[k]!;
    if (patch.payment === "confirmed" || patch.payment === "rejected")
      s.payment = patch.payment;
    if (typeof patch.orderDelay === "number")
      s.orderDelay = Math.max(500, Math.min(60000, patch.orderDelay));
    save();
    return HttpResponse.json(s);
  }),
  http.post("/api/demo/actions", async ({ request }) => {
    const { action, id } = (await request.json()) as {
      action: string;
      id?: string;
    };
    if (action === "reset") {
      await reset();
      return HttpResponse.json({ ok: true });
    }
    if (action === "disconnect") {
      for (const disconnect of disconnectors) disconnect();
      return HttpResponse.json({ ok: true });
    }
    if (action === "expire") {
      const active = db().session;
      if (active) active.expiresAt = 0;
      save();
      return HttpResponse.json({ ok: true });
    }
    const nft = db().nfts.find((n) => n.id === (id ?? "nft-1"));
    if (!nft) return err("NFT inexistente.", 404);
    if (action === "price") {
      nft.price = fromWei(toWei(nft.price) + toWei("0.1"));
      nft.version++;
      save();
      nftEvent(nft);
    } else if (action === "soldout") {
      nft.available = 0;
      nft.version++;
      save();
      nftEvent(nft);
    } else if (action === "old") {
      const version = Math.max(0, nft.version - 1);
      emit("nft.updated", {
        eventId: randomId(),
        resourceId: nft.id,
        version,
        data: { ...nft, price: "0.01", available: 99, version },
      });
    } else if (action === "duplicate") {
      nftEvent(nft);
      nftEvent(nft);
    } else return err("Ação desconhecida.");
    return HttpResponse.json(nft);
  }),
);
export async function startMocks() {
  await initialize();
  await worker.start({ onUnhandledRequest: "bypass" });
}
