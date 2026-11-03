import { ChevronLeft, MailCheck, Wallet as WalletIcon } from "lucide-react";
import { LiveTools } from "./live-tools";
import { randomId } from "../lib/id";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { formatEth } from "../lib/money";
import type { OrderInput, Quote, Wallet } from "../lib/contracts";
import { useSession } from "./session";
import { LoginRequired } from "./account-pages";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
interface Attempt {
  key: string;
  body: OrderInput;
  orderId?: string;
}
function readAttempt(owner: string): Attempt | null {
  try {
    return JSON.parse(localStorage.getItem(`forma.attempt.${owner}`) ?? "null");
  } catch {
    return null;
  }
}
export function ReceiptSummary({ quote }: { quote: Quote }) {
  return (
    <aside className="summary">
      <h2>Resumo do pedido</h2>
      {quote.items.map((l) => (
        <div className="receipt-art-line" key={l.nft.id}>
          <span>
            <img src={l.nft.image} width="55" height="60" alt="" />
            <b>
              {l.nft.name} × {l.quantity}
            </b>
          </span>
          <strong>{formatEth(l.nft.price)} ETH / un.</strong>
        </div>
      ))}
      <div>
        <span>Subtotal</span>
        <strong>{formatEth(quote.subtotal)} ETH</strong>
      </div>
      <div>
        <span>Desconto</span>
        <strong>−{formatEth(quote.discount)} ETH</strong>
      </div>
      <div>
        <span>Taxa de rede simulada</span>
        <strong>{formatEth(quote.networkFee)} ETH</strong>
      </div>
      <div className="total">
        <span>Total</span>
        <strong>{formatEth(quote.total)} ETH</strong>
      </div>
    </aside>
  );
}
export function CheckoutPage() {
  const s = useSession();
  if (!s.data?.user) return <LoginRequired />;
  return (
    <CheckoutForm
      key={s.data.user.id}
      owner={s.data.user.id}
      initialName={s.data.user.name}
      initialEmail={s.data.user.email}
    />
  );
}
function CheckoutForm({
  owner,
  initialName,
  initialEmail,
}: {
  owner: string;
  initialName: string;
  initialEmail: string;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const quote = useQuery({
    queryKey: ["quote", owner],
    queryFn: ({ signal }) => api.quote(signal),
    staleTime: 0,
  });
  const wallets = useQuery({
    queryKey: ["wallets", owner],
    queryFn: ({ signal }) => api.wallets(signal),
  });
  const [walletId, setWalletId] = useState("");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [connection, setConnection] = useState("disconnected");
  const [simulation, setSimulation] = useState("accept");
  const [provider, setProvider] = useState("coinbase");
  const [collectorOpen, setCollectorOpen] = useState(
    () => window.matchMedia("(min-width:701px)").matches,
  );
  const [review, setReview] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(() => readAttempt(owner));
  const lock = useRef(false);
  const wallet = wallets.data?.find(
    (w) => w.id === (walletId || wallets.data.find((x) => x.primary)?.id),
  );
  const storeAttempt = (value: Attempt) => {
    localStorage.setItem(`forma.attempt.${owner}`, JSON.stringify(value));
    setAttempt(value);
  };
  const submit = useMutation({
    mutationFn: async (retry: boolean) => {
      if (lock.current) throw new Error("Operação em andamento");
      lock.current = true;
      try {
        let current = readAttempt(owner) ?? (retry ? attempt : null);
        if (!current) {
          const latest = await api.quote();
          if (!review || latest.fingerprint !== review.fingerprint) {
            setReview(latest);
            client.setQueryData(["quote", owner], latest);
            throw new Error(
              "Os valores mudaram. Revise o novo resumo antes de confirmar.",
            );
          }
          if (!wallet) throw new Error("Selecione sua carteira.");
          current = {
            key: randomId(),
            body: {
              quoteId: latest.id,
              walletId: wallet.id,
              network: wallet.network,
              buyer: { name, email },
            },
          };
          storeAttempt(current);
        }
        return {
          order: await api.order(current.body, current.key),
          attempt: current,
        };
      } finally {
        lock.current = false;
      }
    },
    onSuccess: async ({ order, attempt: current }) => {
      storeAttempt({ ...current, orderId: order.id });
      setReview(null);
      await navigate({ to: "/orders/$id", params: { id: order.id } });
    },
    onError: async (e) => {
      setMessage(
        e instanceof Error && !(e as { isAxiosError?: boolean }).isAxiosError
          ? e.message
          : errorMessage(e),
      );
      const status = (e as { response?: { status: number } }).response?.status;
      if ((e as { isAxiosError?: boolean }).isAxiosError) setReview(null);
      if (status && status >= 400 && status < 500 && status !== 401) {
        localStorage.removeItem(`forma.attempt.${owner}`);
        setAttempt(null);
        setReview(null);
        await quote.refetch();
      }
    },
  });
  const startReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (connection !== "connected") {
      setMessage("Conecte a carteira simulada antes de revisar.");
      return;
    }
    try {
      const latest = await api.quote();
      client.setQueryData(["quote", owner], latest);
      setReview(latest);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };
  return (
    <section className="page checkout-page">
      <div className="checkout-heading">
        <Link
          to="/cart"
          className="circle-back"
          aria-label="Voltar ao carrinho"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1>Pagamento com carteira</h1>
      </div>
      <Link to="/cart" className="back">
        ← Voltar ao carrinho
      </Link>
      <h1>Pagamento</h1>
      <p className="muted">
        Simulação: nenhuma transação ou cobrança real será realizada.
      </p>
      {attempt ? (
        <div className="resume-panel">
          <h2>Existe uma tentativa de compra em andamento</h2>
          <p>Recupere a mesma tentativa para evitar uma compra duplicada.</p>
          {attempt.orderId ? (
            <Button asChild>
              <Link to="/orders/$id" params={{ id: attempt.orderId }}>
                Consultar pedido
              </Link>
            </Button>
          ) : (
            <Button
              disabled={submit.isPending}
              onClick={() => submit.mutate(true)}
            >
              {submit.isPending ? "Recuperando…" : "Recuperar mesma tentativa"}
            </Button>
          )}
        </div>
      ) : (
        <div className="checkout-layout">
          <form className="form-panel checkout-form" onSubmit={startReview}>
            <div className="wallet-cards-title">
              <strong>
                {connection === "connected"
                  ? "Carteira conectada"
                  : "Carteira cadastrada"}
              </strong>
              <Link to="/wallets">Trocar carteira</Link>
            </div>
            <WalletSelect
              wallets={wallets.data ?? []}
              value={wallet?.id ?? ""}
              onChange={(id) => {
                setWalletId(id);
                setConnection("disconnected");
              }}
            />
            <h2>Carteira e rede</h2>
            <div
              className="provider-options"
              role="radiogroup"
              aria-label="Tipo de carteira simulada"
            >
              {[
                ["walletconnect", "W", "WalletConnect"],
                ["metamask", "M", "MetaMask"],
                ["coinbase", "C", "Coinbase Wallet"],
              ].map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  className="provider-option"
                  role="radio"
                  aria-checked={provider === id}
                  onClick={() => {
                    setProvider(id);
                    setConnection("disconnected");
                  }}
                >
                  <span className="provider-icon" aria-hidden="true">
                    {id === "coinbase" ? <WalletIcon size={20} /> : icon}
                  </span>
                  {label}
                  <span className="radio-dot" aria-hidden="true" />
                </button>
              ))}
            </div>
            {quote.data && (
              <div className="checkout-inline-total">
                <span>Total:</span>
                <strong>{formatEth(quote.data.total)} ETH</strong>
              </div>
            )}
            <details
              className="collector-fields"
              open={collectorOpen}
              onToggle={(e) => setCollectorOpen(e.currentTarget.open)}
            >
              <summary>Dados do colecionador</summary>
              <div>
                <label>
                  Nome completo
                  <input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  E-mail para o recibo
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Rede
                  <input value={wallet?.network ?? ""} readOnly />
                </label>
                <label>
                  Endereço da carteira
                  <input value={wallet?.address ?? ""} readOnly />
                </label>
              </div>
            </details>
            <details className="simulation-controls">
              <summary>Opções da conexão simulada</summary>
              <label>
                Resposta da carteira simulada
                <select
                  value={simulation}
                  onChange={(e) => setSimulation(e.target.value)}
                >
                  <option value="accept">Aceitar conexão</option>
                  <option value="reject">Recusar conexão</option>
                </select>
              </label>
              <p>Nenhuma extensão ou carteira real é utilizada.</p>
            </details>
            <Button
              className="wallet-connect-button"
              type="button"
              variant="outline"
              onClick={() => {
                if (connection === "connected") setConnection("disconnected");
                else if (simulation === "reject") {
                  setConnection("rejected");
                  setMessage("Conexão recusada na simulação. Tente novamente.");
                } else {
                  setConnection("connected");
                  setMessage("Carteira simulada conectada.");
                }
              }}
            >
              {connection === "connected"
                ? "Desconectar carteira simulada"
                : "Conectar carteira simulada"}
            </Button>
            <p className="connection-state">
              Estado:{" "}
              {connection === "connected"
                ? "Conectada"
                : connection === "rejected"
                  ? "Recusada"
                  : "Desconectada"}
            </p>
            <Button
              className="checkout-main-submit"
              disabled={
                quote.isPending || !wallet || connection !== "connected"
              }
            >
              Confirmar compra
            </Button>
          </form>
          {quote.isPending ? (
            <div className="summary skeleton" aria-busy="true">
              <h2>Carregando cotação…</h2>
              <div className="skeleton-art" />
            </div>
          ) : quote.isError ? (
            <div className="summary" role="alert">
              <p>{errorMessage(quote.error)}</p>
              <Button onClick={() => void quote.refetch()}>
                Revalidar cotação
              </Button>
              <Link to="/cart">Ajustar carrinho →</Link>
            </div>
          ) : (
            <ReceiptSummary quote={quote.data} />
          )}
        </div>
      )}
      {quote.data?.items[0] && <LiveTools id={quote.data.items[0].nft.id} />}
      <p role="alert" className="form-error">
        {message}
      </p>
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!submit.isPending && !open) setReview(null);
        }}
        title="Revise antes de confirmar"
        description="Confira itens, desconto, taxa, carteira e total. Compra inteiramente simulada."
      >
        {review && (
          <>
            <ReceiptSummary quote={review} />
            <p>
              {name} · {email}
            </p>
            <p>
              Carteira: {wallet?.label} · {wallet?.network}
            </p>
            <p role="alert" className="form-error">
              {message}
            </p>
            <Button
              disabled={submit.isPending || connection !== "connected"}
              onClick={() => submit.mutate(false)}
            >
              {submit.isPending
                ? "Enviando pedido…"
                : "Confirmar compra simulada"}
            </Button>
          </>
        )}
      </Dialog>
    </section>
  );
}
function WalletSelect({
  wallets,
  value,
  onChange,
}: {
  wallets: Wallet[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="wallet-cards"
      role="radiogroup"
      aria-label="Carteira cadastrada"
    >
      {!wallets.length && (
        <Link to="/wallets">Cadastre sua carteira simulada →</Link>
      )}
      {wallets.map((w) => (
        <button
          key={w.id}
          type="button"
          role="radio"
          aria-checked={value === w.id}
          className="wallet-option"
          onClick={() => onChange(w.id)}
        >
          <span className="radio-dot" aria-hidden="true" />
          <span>
            <strong>{w.label}</strong>
            <small>
              {w.address.slice(0, 8)}…{w.address.slice(-4)}
              <br />
              Rede {w.network === "ethereum" ? "principal Ethereum" : "Polygon"}
            </small>
          </span>
        </button>
      ))}
    </div>
  );
}

export function OrderPage() {
  const { id } = useParams({ from: "/orders/$id" });
  const session = useSession();
  const owner = session.data?.user?.id;
  const client = useQueryClient();
  const order = useQuery({
    queryKey: ["order", owner, id],
    queryFn: ({ signal }) => api.getOrder(id, signal),
    enabled: !!owner,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 1500 : false),
  });
  const orderStatus = order.data?.status;
  useEffect(() => {
    if (orderStatus && orderStatus !== "pending" && owner) {
      localStorage.removeItem(`forma.attempt.${owner}`);
      void client.invalidateQueries({ queryKey: ["cart", owner] });
      void client.invalidateQueries({ queryKey: ["nfts"] });
    }
  }, [orderStatus, owner, client]);
  if (!owner) return <LoginRequired />;
  return (
    <section className="page order-page">
      {order.isPending ? (
        <h1>Consultando pedido…</h1>
      ) : order.isError ? (
        <div role="alert">
          <h1>Não foi possível consultar</h1>
          <p>{errorMessage(order.error)}</p>
          <Button onClick={() => void order.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className={`order-result ${order.data.status}`}>
            {order.data.status === "confirmed" && (
              <div className="confirmation-symbol">
                <MailCheck aria-hidden="true" />
              </div>
            )}
            <span className="pill">
              {order.data.status === "confirmed"
                ? "Confirmado"
                : order.data.status === "rejected"
                  ? "Recusado"
                  : "Pendente"}
            </span>
            <h1>
              {order.data.status === "confirmed"
                ? "Sua coleção ganhou uma nova obra."
                : order.data.status === "rejected"
                  ? "O pagamento foi recusado."
                  : "Seu pedido está em processamento."}
            </h1>
            <p role="status">
              {order.data.status === "pending"
                ? "Você pode atualizar esta página. O pedido será recuperado sem uma nova compra."
                : order.data.status === "rejected"
                  ? order.data.reason
                  : "Compra confirmada pela API simulada."}
            </p>
            <p>
              Pedido: <code>{order.data.id}</code>
            </p>
            <p>
              Transação simulada: <code>{order.data.transaction}</code>
            </p>
            <p>
              Não existe link de exploração real para esta transação fictícia.
            </p>
          </div>
          <ReceiptSummary quote={order.data.receipt} />
          <LiveTools id={order.data.receipt.items[0]?.nft.id ?? "nft-1"} />
          <p>
            Carteira: {order.data.wallet.label} · {order.data.wallet.network}
          </p>
          <p>Recibo para: {order.data.buyer.email}</p>
          <Button variant="outline" asChild>
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </>
      )}
    </section>
  );
}
