import { useState, useEffect, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useSearch,
  useParams,
  useLocation,
} from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Box,
  Home,
  Heart,
  UserRound,
  ScanLine,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { api, errorMessage } from "./lib/api";
import { formatEth } from "./lib/money";
import type { Filters, NFT } from "./lib/contracts";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import {
  useSession,
  useCart,
  usePrivateKey,
  replaceSession,
} from "./features/session";
import { Realtime } from "./features/realtime";
import { LiveTools } from "./features/live-tools";
import { Favorite } from "./features/favorite";
export const defaultFilters: Filters = {
  q: "",
  category: "",
  sort: "recent",
  page: 1,
};
export function Layout({ children }: { children: ReactNode }) {
  const currentPath = useLocation({ select: (l) => l.href });
  const pathname = useLocation({ select: (l) => l.pathname });
  const session = useSession();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => replaceSession({ user: null, expiresAt: null }),
  });
  const cart = useCart();
  const [auxiliary, setAuxiliary] = useState("");
  const count = cart.data?.items.reduce((s, l) => s + l.quantity, 0) ?? 0;
  const auth = pathname === "/login" || pathname === "/register";
  const catalog = pathname === "/" || pathname === "/favorites";
  const detail = pathname.startsWith("/nft/");
  return (
    <div
      className={`app-shell ${auth ? "auth-shell" : ""} ${catalog ? "catalog-shell" : ""} ${detail ? "detail-shell" : ""}`}
    >
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            to="/"
            search={defaultFilters}
            className="logo"
            aria-label="Kurio início"
          >
            KURIO
          </Link>
          <nav aria-label="Principal">
            <Link to="/" search={defaultFilters}>
              Início
            </Link>
            <a href="/#explore">Mercado</a>
            <button
              onClick={() =>
                setAuxiliary(
                  "A página de criadores não faz parte desta demonstração.",
                )
              }
            >
              Criadores
            </button>
            <button
              onClick={() =>
                setAuxiliary(
                  "As páginas de aprendizado não fazem parte desta demonstração.",
                )
              }
            >
              Aprenda
            </button>
          </nav>
          <Link
            to="/cart"
            className="cart-link"
            aria-label={`Carrinho, ${count} itens`}
          >
            <ShoppingCart size={18} />
            <span>Carrinho</span>
            <b>{count}</b>
          </Link>
          {session.data?.user ? (
            <div className="session-menu">
              <Link to="/profile">Minha conta</Link>
              <button
                aria-label="Sair da sessão"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                Sair
              </button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/login" search={{ redirect: currentPath }}>
                Conectar
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main id="main">{children}</main>
      <div className="system-status">
        <Realtime />
        {auxiliary && <p role="status">{auxiliary}</p>}
        {session.isError && (
          <p role="alert">
            Não foi possível carregar a sessão.{" "}
            <button onClick={() => void session.refetch()}>
              Tentar novamente
            </button>
          </p>
        )}
      </div>
      <footer className="site-footer">
        <section className="footer-benefits">
          <div>
            <ShieldCheck />
            <h3>Segurança da carteira</h3>
            <p>
              Proteja sua coleção digital. Confira sempre os dados antes de
              comprar.
            </p>
          </div>
          <div>
            <Sparkles />
            <h3>Criadores em destaque</h3>
            <p>Conheça artistas e coleções com novas perspectivas.</p>
          </div>
          <div>
            <Bell />
            <h3>Alertas de lançamentos</h3>
            <p>Descubra o próximo capítulo da arte digital.</p>
          </div>
          <Newsletter />
        </section>
        <div className="footer-brand">
          <Link to="/" search={defaultFilters} className="logo">
            KURIO
          </Link>
          <p>Feito para colecionadores, criadores e cultura digital.</p>
          <span>Ambiente de demonstração</span>
        </div>
        <div className="footer-links">
          <div>
            <h3>Meu perfil</h3>
            <Link to="/profile">Meu perfil</Link>
            <Link to="/wallets">Minhas carteiras</Link>
            <Link to="/favorites" search={defaultFilters}>
              Meus favoritos
            </Link>
          </div>
          <div>
            <h3>Coleções</h3>
            <Link to="/" search={defaultFilters}>
              Arte digital
            </Link>
            <Link to="/" search={{ ...defaultFilters, category: "3D" }}>
              Arte 3D
            </Link>
            <Link to="/" search={{ ...defaultFilters, category: "Fotografia" }}>
              Fotografia
            </Link>
          </div>
          <div>
            <h3>Sobre a simulação</h3>
            <Link to="/demo">Testar cenários</Link>
            <p>
              Sem cobranças reais.
              <br />
              Sem conexão à blockchain.
            </p>
            {session.data?.user && (
              <button onClick={() => logout.mutate()}>Sair da conta</button>
            )}
          </div>
        </div>
        <small>
          © 2026 Kurio. Projeto de demonstração com NFTs fictícios.
        </small>
      </footer>
      {catalog && (
        <nav className="mobile-nav" aria-label="Navegação mobile">
          <Link
            to="/"
            search={defaultFilters}
            aria-label="Início"
            className={pathname === "/" ? "active" : ""}
          >
            <Home size={21} />
          </Link>
          <Link
            to="/favorites"
            search={defaultFilters}
            aria-label="Favoritos"
            className={pathname === "/favorites" ? "active" : ""}
          >
            <Heart size={21} />
          </Link>
          <Link
            className="nav-center"
            to="/cart"
            aria-label={`Abrir carrinho, ${count} itens`}
          >
            <ScanLine size={28} />
          </Link>
          <Link to="/cart" aria-label={`Carrinho, ${count} itens`}>
            <ShoppingCart size={21} />
            {count > 0 && <span className="nav-count">{count}</span>}
          </Link>
          <Link to="/profile" aria-label="Meu perfil">
            <UserRound size={21} />
          </Link>
        </nav>
      )}
    </div>
  );
}
export function Missing() {
  return (
    <section className="empty">
      <Box size={40} />
      <h1>Página não encontrada</h1>
      <p>Este endereço não está disponível.</p>
      <Link to="/" search={defaultFilters}>
        Voltar para explorar →
      </Link>
    </section>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="empty" role="alert">
      <h2>Algo não saiu como esperado</h2>
      <p>{errorMessage(error)}</p>
      <Button onClick={retry}>Tentar novamente</Button>
    </div>
  );
}
function Skeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid" aria-label="Carregando NFTs" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="card skeleton" key={i}>
          <div className="skeleton-art" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
function NFTCard({ nft }: { nft: NFT }) {
  return (
    <article className="card">
      <div className="art-wrap">
        <Link
          to="/nft/$id"
          params={{ id: nft.id }}
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={nft.image}
            alt={`Arte digital ${nft.name}`}
            width="300"
            height="300"
            loading="lazy"
          />
        </Link>
        {nft.rare && <span className="rare-badge">RARO</span>}
        <Favorite id={nft.id} compact />
      </div>
      <div className="card-body">
        <h3>
          <Link to="/nft/$id" params={{ id: nft.id }}>
            {nft.name}
          </Link>
        </h3>
        <strong>{formatEth(nft.price)} ETH</strong>
        <span className="card-stock">
          {nft.available ? `${nft.available} disponíveis` : "Esgotado"}
        </span>
      </div>
    </article>
  );
}
export function CatalogPage() {
  const raw = useSearch({ strict: false }) as Partial<Filters>;
  const filters: Filters = {
    q: raw.q ?? "",
    category: raw.category ?? "",
    sort: raw.sort ?? "recent",
    page: raw.page ?? 1,
    view: raw.view ?? "all",
  };
  const favorites = useLocation({ select: (l) => l.pathname }) === "/favorites";
  const session = useSession();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const update = (patch: Partial<Filters>) => {
    void navigate({
      to: favorites ? "/favorites" : "/",
      search: { ...filters, ...patch, page: patch.page ?? 1 },
    });
  };
  const catalog = useQuery({
    queryKey: [
      "nfts",
      favorites ? session.data?.user?.id : "public",
      filters,
      favorites,
    ],
    queryFn: ({ signal }) =>
      api.catalog({ ...filters, favoriteOnly: favorites }, signal),
    enabled: !favorites || !!session.data?.user,
  });
  if (favorites && !session.isPending && !session.data?.user)
    return (
      <section className="empty">
        <h1>Entre para ver seus favoritos</h1>
        <Button asChild>
          <Link to="/login" search={{ redirect: "/favorites" }}>
            Entrar
          </Link>
        </Button>
      </section>
    );
  return (
    <>
      <section className="catalog-search">
        <label className="search">
          <Search size={20} />
          <input
            aria-label="Buscar NFTs"
            placeholder="Explorar coleções"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </label>
        <Button
          aria-label="Abrir filtros"
          className="filter-toggle"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal size={21} />
        </Button>
      </section>
      {!favorites && (
        <section className="hero">
          <div className="hero-copy">
            <span className="welcome">Bem-vindo à Kurio</span>
            <h1>
              <span className="desktop-hero-title">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </span>
              <span className="mobile-hero-title">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </span>
            </h1>
            <p>Descubra NFTs selecionados de criadores do mundo todo.</p>
            <a className="hero-action" href="#explore">
              EXPLORAR <ArrowRight size={17} />
            </a>
          </div>
          <Link
            to="/nft/$id"
            params={{ id: "nft-1" }}
            className="hero-art"
            aria-label="Explorar Emerald Ape"
          >
            <img
              className="hero-primary"
              src="/nfts/emerald-card.webp"
              alt="Emerald Ape, macaco com óculos e jaqueta verde"
              width="168"
              height="168"
              fetchPriority="high"
            />
            <img
              className="hero-secondary"
              src="/nfts/sage.webp"
              alt="Sage Nomad, macaco de chapéu"
              width="168"
              height="168"
            />
          </Link>
          <span className="hero-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </section>
      )}
      <section className="explore" id="explore">
        {favorites && (
          <div className="section-title">
            <h1>Meus favoritos</h1>
            <p>As obras que você quer guardar por perto.</p>
          </div>
        )}
        <div className="catalog-tabs">
          <button
            className={filters.view === "all" ? "active" : ""}
            onClick={() => update({ view: "all" })}
          >
            {favorites ? "NFTs favoritos" : "Todos os NFTs"}
          </button>
          <button
            className={filters.view === "new" ? "active" : ""}
            onClick={() => update({ view: "new" })}
          >
            Novos lançamentos
          </button>
          <button
            className={filters.view === "trending" ? "active" : ""}
            onClick={() => update({ view: "trending" })}
          >
            Em alta
          </button>
        </div>
        <div className="catalog-layout">
          <aside className="desktop-filters">
            <h2>Filtros</h2>
            <label>
              Categoria
              <select
                aria-label="Filtrar categoria"
                value={filters.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                <option value="">Todas as categorias</option>
                <option>Arte</option>
                <option>3D</option>
                <option>Fotografia</option>
              </select>
            </label>
            <label>
              Ordenar
              <select
                aria-label="Ordenar NFTs"
                value={filters.sort}
                onChange={(e) =>
                  update({ sort: e.target.value as Filters["sort"] })
                }
              >
                <option value="recent">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
            {filters.category && (
              <Button
                variant="outline"
                onClick={() => update({ category: "", q: "" })}
              >
                Limpar filtros
              </Button>
            )}
            <p>{catalog.data ? `${catalog.data.total} obras` : "Buscando…"}</p>
          </aside>
          <div className="catalog-results">
            <div className="sr-only" aria-live="polite">
              {catalog.data
                ? `${catalog.data.total} obras para descobrir`
                : "Buscando obras"}
            </div>
            {catalog.isPending ? (
              <Skeleton />
            ) : catalog.isError ? (
              <Failure
                error={catalog.error}
                retry={() => void catalog.refetch()}
              />
            ) : !catalog.data.items.length ? (
              <div className="empty">
                <Search size={32} />
                <h2>
                  {favorites
                    ? "Nenhum favorito por enquanto"
                    : "Nenhuma obra encontrada"}
                </h2>
                <p>
                  {favorites
                    ? "Toque no coração de uma obra para salvar."
                    : "Tente outra busca ou remova os filtros."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => update({ q: "", category: "" })}
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="grid">
                  {catalog.data.items.map((n) => (
                    <NFTCard key={n.id} nft={n} />
                  ))}
                </div>
                <div className="pagination">
                  <Button
                    variant="outline"
                    disabled={filters.page === 1}
                    onClick={() => update({ page: filters.page - 1 })}
                  >
                    <ArrowLeft size={15} />
                    Anterior
                  </Button>
                  <span>
                    {filters.page} / {catalog.data.pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={filters.page >= catalog.data.pages}
                    onClick={() => update({ page: filters.page + 1 })}
                  >
                    Próxima
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      {!favorites && <HomeSections />}
      <Dialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filtrar coleções"
        description="Combine categoria, busca e ordenação para encontrar sua próxima obra."
      >
        <div className="filter-dialog-fields">
          <label>
            Categoria
            <select
              aria-label="Categoria mobile"
              value={filters.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">Todas as categorias</option>
              <option>Arte</option>
              <option>3D</option>
              <option>Fotografia</option>
            </select>
          </label>
          <label>
            Ordenação
            <select
              aria-label="Ordenação mobile"
              value={filters.sort}
              onChange={(e) =>
                update({ sort: e.target.value as Filters["sort"] })
              }
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </label>
          <Button onClick={() => setFilterOpen(false)}>Ver resultados</Button>
        </div>
      </Dialog>
    </>
  );
}
export function DetailPage() {
  const { id } = useParams({ from: "/nft/$id" });
  const detail = useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => api.detail(id, signal),
  });
  const cart = useCart();
  const cartKey = usePrivateKey("cart");
  const client = useQueryClient();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setQuantity(1);
    setNotice("");
  }, [id]);
  const add = useMutation({
    mutationFn: () =>
      api.updateCart(
        id,
        quantity +
          (cart.data?.items.find((l) => l.nft.id === id)?.quantity ?? 0),
      ),
    onSuccess: (data, _vars) => {
      client.setQueryData(cartKey, data);
      setNotice("Obra adicionada ao carrinho.");
    },
    onError: (e) => setNotice(errorMessage(e)),
  });
  const valid =
    !!detail.data &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= detail.data.available;
  return (
    <section className="page detail-page">
      <div className="mobile-page-top detail-top">
        <Link
          to="/"
          search={defaultFilters}
          className="circle-back"
          aria-label="Voltar para explorar"
        >
          <ChevronLeft size={21} />
        </Link>
        <Favorite id={detail.data?.parentId ?? id} compact />
      </div>
      <Link to="/" search={defaultFilters} className="back desktop-only">
        <ArrowLeft size={16} /> Início / Mercado / NFT
      </Link>
      {detail.isPending ? (
        <Skeleton count={1} />
      ) : detail.isError ? (
        <Failure error={detail.error} retry={() => void detail.refetch()} />
      ) : (
        <>
          <div className="detail">
            <div className="detail-gallery">
              <img
                className="detail-image"
                src={detail.data.galleryImage ?? detail.data.image}
                alt={`Arte digital ${detail.data.name}`}
                width="600"
                height="540"
              />
              <div className="desktop-thumbnails">
                <img
                  src={detail.data.image}
                  width="65"
                  height="65"
                  alt="Edição selecionada"
                />
              </div>
            </div>
            <div className="detail-info">
              <div className="detail-title">
                <h1>{detail.data.name}</h1>
                <span
                  className="rating"
                  aria-label="Avaliação 4,8 de 5, 19 avaliações"
                >
                  ★ 4.8(19)
                </span>
              </div>
              <p className="description">
                {detail.data.description ??
                  "Um colecionável digital da coleção Kurio Editions."}
              </p>
              <div className="edition-info">
                <h2>Edição:</h2>
                <div className="edition-chips" aria-label="Edições disponíveis">
                  {(
                    detail.data.editions ?? [
                      {
                        id: detail.data.id,
                        label: detail.data.edition ?? "1/50",
                        price: detail.data.price,
                        available: detail.data.available,
                      },
                    ]
                  ).map((edition) => (
                    <button
                      key={edition.id}
                      className={edition.id === id ? "selected" : ""}
                      aria-pressed={edition.id === id}
                      aria-label={`Edição ${edition.label}${edition.available ? "" : " esgotada"}`}
                      disabled={!edition.available && edition.id !== id}
                      onClick={() =>
                        void navigate({
                          to: "/nft/$id",
                          params: { id: edition.id },
                        })
                      }
                    >
                      {edition.label}
                      {!edition.available ? " · esgotada" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <dl className="nft-metadata">
                <div>
                  <dt>ID do token:</dt>
                  <dd>#{detail.data.token ?? id}</dd>
                </div>
                <div>
                  <dt>Coleção:</dt>
                  <dd>{detail.data.collection ?? "Kurio Apes"}</dd>
                </div>
                <div>
                  <dt>Atributos:</dt>
                  <dd>
                    {detail.data.rare
                      ? "Raro, Colecionável"
                      : "Óculos, Esmeralda, Colecionável"}
                  </dd>
                </div>
              </dl>
              <div className="desktop-favorite">
                <Favorite id={detail.data?.parentId ?? id} />
              </div>
              <div className="detail-purchase">
                <div className="detail-quantity">
                  <label htmlFor="quantity">Qtd.</label>
                  <Button
                    variant="ghost"
                    aria-label="Diminuir quantidade"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    <Minus size={13} />
                  </Button>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max={detail.data.available}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  <Button
                    variant="ghost"
                    aria-label="Aumentar quantidade"
                    disabled={quantity >= detail.data.available}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={13} />
                  </Button>
                  <strong>{formatEth(detail.data.price)} ETH</strong>
                </div>
                <div className="detail-buy-actions">
                  <Button
                    disabled={add.isPending || !cart.data || !valid}
                    onClick={() => {
                      add.mutate(undefined, {
                        onSuccess: () => {
                          void navigate({ to: "/cart" });
                        },
                      });
                    }}
                  >
                    Comprar NFT
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="Adicionar ao carrinho"
                    disabled={add.isPending || !cart.data || !valid}
                    onClick={() => add.mutate()}
                  >
                    <ShoppingCart size={21} />
                    <span className="sr-only">Adicionar ao carrinho</span>
                  </Button>
                </div>
                <p className="detail-notice" role="status">
                  {notice ||
                    (!detail.data.available
                      ? "Edição esgotada"
                      : `${detail.data.available} edições disponíveis`)}
                </p>
              </div>
            </div>
          </div>
          <div className="detail-extra">
            <h2>Detalhes do NFT</h2>
            <p>
              {detail.data.name} é um colecionável da Kurio Editions. Os dados,
              a propriedade e a compra desta demonstração são simulados.
            </p>
            <Link to="/" search={defaultFilters}>
              Explorar a coleção →
            </Link>
          </div>
          <RelatedCollection exclude={id} />
          <LiveTools id={id} />
        </>
      )}
    </section>
  );
}
export function CartPage() {
  const cart = useCart();
  const cartKey = usePrivateKey("cart");
  const client = useQueryClient();
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const applyCoupon = useMutation({
    mutationFn: (code: string) => api.coupon(code),
    onSuccess: (data) => {
      client.setQueryData(cartKey, data);
      setMessage("Cupom atualizado.");
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.updateCart(id, quantity),
    onSuccess: (data) => {
      client.setQueryData(cartKey, data);
      setMessage("Carrinho atualizado.");
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  return (
    <section className="page cart-page">
      <div className="mobile-page-top">
        <Link
          to="/"
          search={defaultFilters}
          className="circle-back"
          aria-label="Continuar explorando"
        >
          <ChevronLeft size={21} />
        </Link>
        <h1>Carrinho de NFTs</h1>
      </div>
      <Link to="/" search={defaultFilters} className="back desktop-only">
        <ArrowLeft size={16} />
        Continuar explorando
      </Link>
      <h1 className="desktop-only">Carrinho de NFTs</h1>
      {cart.isPending ? (
        <Skeleton count={1} />
      ) : cart.isError ? (
        <Failure error={cart.error} retry={() => void cart.refetch()} />
      ) : !cart.data.items.length ? (
        <div className="empty">
          <ShoppingCart size={38} />
          <h2>Sua coleção começa aqui</h2>
          <p>Explore o catálogo e adicione uma obra ao carrinho.</p>
          <Button asChild>
            <Link to="/" search={defaultFilters}>
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.data.items.map(({ nft, quantity }) => (
              <article className="cart-row" key={nft.id}>
                <Link to="/nft/$id" params={{ id: nft.id }}>
                  <img
                    src={nft.image}
                    alt={nft.name}
                    width="100"
                    height="100"
                  />
                </Link>
                <div className="cart-row-info">
                  <h2>{nft.name}</h2>
                  <small>Edição: {nft.edition ?? "1/50"}</small>
                  <strong>{formatEth(nft.price)} ETH</strong>
                </div>
                <div className="quantity-controls">
                  <Button
                    variant="ghost"
                    aria-label={`Diminuir ${nft.name}`}
                    disabled={update.isPending || quantity <= 1}
                    onClick={() =>
                      update.mutate({ id: nft.id, quantity: quantity - 1 })
                    }
                  >
                    <Minus size={13} />
                  </Button>
                  <span aria-label="Quantidade">{quantity}</span>
                  <Button
                    variant="ghost"
                    aria-label={`Aumentar ${nft.name}`}
                    disabled={update.isPending || quantity >= nft.available}
                    onClick={() =>
                      update.mutate({ id: nft.id, quantity: quantity + 1 })
                    }
                  >
                    <Plus size={13} />
                  </Button>
                  <Button
                    className="remove-item"
                    variant="ghost"
                    aria-label={`Remover ${nft.name}`}
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: nft.id, quantity: 0 })}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary cart-summary">
            <form
              className="coupon-form"
              onSubmit={(e) => {
                e.preventDefault();
                applyCoupon.mutate(coupon);
              }}
            >
              <label htmlFor="coupon" className="sr-only">
                Cupom de desconto
              </label>
              <input
                id="coupon"
                placeholder="Digite o código promocional..."
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <Button disabled={applyCoupon.isPending}>Aplicar</Button>
            </form>
            {cart.data.coupon && (
              <Button
                variant="ghost"
                onClick={() => applyCoupon.mutate("")}
                disabled={applyCoupon.isPending}
              >
                Remover cupom {cart.data.coupon}
              </Button>
            )}
            <div>
              <span>Subtotal</span>
              <strong>{formatEth(cart.data.subtotal)} ETH</strong>
            </div>
            <div>
              <span>Desconto do lançamento</span>
              <strong>(−) {formatEth(cart.data.discount)}</strong>
            </div>
            <div>
              <span>Taxa de rede</span>
              <strong>
                {formatEth(cart.data.networkFee)} ETH
                <small>Taxa simulada</small>
              </strong>
            </div>
            <div className="total">
              <span>Total</span>
              <strong>{formatEth(cart.data.total)} ETH</strong>
            </div>
            <Button asChild>
              <Link to="/checkout">Conectar e finalizar</Link>
            </Button>
          </aside>
        </div>
      )}
      {!!cart.data?.items.length && <RelatedCollection />}
      <p className="form-feedback" role="status">
        {message}
      </p>
      {cart.data?.items[0] && <LiveTools id={cart.data.items[0].nft.id} />}
    </section>
  );
}

function RelatedCollection({ exclude }: { exclude?: string }) {
  const query = useQuery({
    queryKey: ["nfts", "related"],
    queryFn: ({ signal }) => api.catalog(defaultFilters, signal),
    enabled: window.matchMedia("(min-width:701px)").matches,
  });
  if (!query.data) return null;
  return (
    <section className="related-collection">
      <h2>{exclude ? "Mais desta coleção" : "Colecionadores também viram"}</h2>
      <div className="grid">
        {query.data.items
          .filter((n) => n.id !== exclude)
          .slice(0, 5)
          .map((n) => (
            <NFTCard key={n.id} nft={n} />
          ))}
      </div>
    </section>
  );
}
function HomeSections() {
  return (
    <>
      <section className="home-promo-grid">
        <Link to="/" search={{ ...defaultFilters, view: "new" }}>
          <img
            src="/nfts/emerald-card.webp"
            alt="Emerald Ape"
            width="450"
            height="450"
            loading="lazy"
          />
          <span>
            <h2>
              Lançamentos gênesis
              <br />
              de edição limitada
            </h2>
            <small>
              Colecione edições selecionadas e encontre sua próxima descoberta.
            </small>
            <br />
            <b>Explorar →</b>
          </span>
        </Link>
        <Link to="/" search={{ ...defaultFilters, category: "Arte" }}>
          <img
            src="/nfts/ivory.webp"
            alt="Ivory Baron"
            width="211"
            height="211"
            loading="lazy"
          />
          <span>
            <h2>
              Arte digital selecionada
              <br />e muito mais
            </h2>
            <small>
              Explore novos artistas, coleções e obras que definem a cultura
              digital.
            </small>
            <br />
            <b>Explorar →</b>
          </span>
        </Link>
      </section>
      <section className="editorial-preview">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="editorial-grid">
          {[
            [
              "ivory",
              "Como funciona a propriedade de NFTs",
              "Aprenda a colecionar e conhecer a arte digital.",
            ],
            [
              "emerald-card",
              "Artistas digitais para acompanhar",
              "Conheça criadores que moldam a cultura digital.",
            ],
            [
              "sage",
              "Raridade, atributos e procedência",
              "Entenda a história por trás de uma coleção.",
            ],
            [
              "golden",
              "Como proteger sua carteira",
              "Cuide das suas credenciais e da sua coleção.",
            ],
          ].map(([image, title, copy]) => (
            <article key={image}>
              <img
                src={`/nfts/${image}.webp`}
                width="250"
                height="200"
                alt=""
                loading="lazy"
              />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
function Newsletter() {
  const [message, setMessage] = useState("");
  return (
    <form
      className="footer-newsletter"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("Inscrições indisponíveis nesta demonstração.");
      }}
    >
      <label htmlFor="newsletter">Antecipe-se ao próximo lançamento</label>
      <div>
        <input
          id="newsletter"
          type="email"
          placeholder="digite seu e-mail..."
          aria-label="E-mail para novidades"
        />
        <button>Enviar</button>
      </div>
      <p>
        Receba lançamentos selecionados, histórias de criadores e novidades do
        mercado.
      </p>
      <p role="status">{message}</p>
    </form>
  );
}
