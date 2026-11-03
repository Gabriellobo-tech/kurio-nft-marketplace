import { CatalogPage, defaultFilters } from "../views";
import { Eye, EyeOff, X } from "lucide-react";
import { safeReturn } from "../lib/return";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import {
  useSession,
  replaceSession,
  usePrivateKey,
  sessionKey,
} from "./session";
import { Button } from "../components/ui/button";
import type { Network, Wallet, Session } from "../lib/contracts";

export function AuthPage({ register = false }: { register?: boolean }) {
  const search = useSearch({ strict: false }) as { redirect?: string };
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [auxMessage, setAuxMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      register
        ? api.register(name, email, password)
        : api.login(email, password),
    onSuccess: async (s) => {
      await replaceSession(s);
      await navigate({ to: safeReturn(search.redirect) });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (register && password !== confirm) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    mutation.mutate();
  }
  return (
    <section
      className={`auth-page ${register ? "register-page" : "login-page"}`}
    >
      <div className="auth-catalog-backdrop" aria-hidden="true" inert>
        <CatalogPage />
      </div>
      <div className="auth-card">
        <Link
          className="auth-close desktop-only"
          to="/"
          search={defaultFilters}
          aria-label="Fechar acesso"
        >
          <X size={20} />
        </Link>
        <Link to="/" search={defaultFilters} className="auth-logo">
          KURIO
        </Link>
        <div className="desktop-auth-tabs">
          <Link
            to="/login"
            search={{ redirect: safeReturn(search.redirect) }}
            className={!register ? "active" : ""}
          >
            Entrar
          </Link>
          <span>|</span>
          <Link
            to="/register"
            search={{ redirect: safeReturn(search.redirect) }}
            className={register ? "active" : ""}
          >
            Criar conta
          </Link>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <h1>{register ? "Criar perfil de colecionador" : "Entrar"}</h1>
          {register && (
            <label>
              <span className="sr-only">Nome</span>
              <input
                placeholder="Nome de usuário"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby="auth-error"
              />
            </label>
          )}
          <label>
            <span className="sr-only">E-mail</span>
            <input
              placeholder={register ? "Digite seu e-mail" : "contato@email.com"}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby="auth-error"
            />
          </label>
          <label className="password-field">
            <span className="sr-only">Senha</span>
            <input
              aria-label="Senha"
              placeholder={register ? "Senha" : "**********"}
              type={showPassword ? "text" : "password"}
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="auth-error"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          </label>
          {register && (
            <label className="password-field">
              <span className="sr-only">Confirmar senha</span>
              <input
                placeholder="Confirmar senha"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-describedby="auth-error"
              />
            </label>
          )}
          {!register && (
            <button
              className="forgot-password"
              type="button"
              onClick={() =>
                setAuxMessage(
                  "A recuperação de senha não faz parte desta demonstração. Use uma conta fictícia de teste.",
                )
              }
            >
              Esqueceu a senha?
            </button>
          )}
          <p className="form-error" id="auth-error" role="alert">
            {error}
          </p>
          <Button className="auth-submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar perfil"
                : "Entrar"}
          </Button>
        </form>
        <div className="social-separator">
          <span>Ou continue com</span>
        </div>
        <div className="social-options">
          <button
            onClick={() =>
              setAuxMessage(
                "O login Google não está integrado nesta simulação. Entre com e-mail e senha fictícios.",
              )
            }
          >
            <img
              className="google-mark"
              src="/nfts/google-mark.webp"
              width="21"
              height="21"
              alt=""
            />
            Continuar com Google
          </button>
          <button
            onClick={() =>
              setAuxMessage(
                "O login Facebook não está integrado nesta simulação. Entre com e-mail e senha fictícios.",
              )
            }
          >
            <span className="facebook-mark" aria-hidden="true">
              f
            </span>
            Continuar com Facebook
          </button>
        </div>
        <p className="auth-switch">
          {register ? "Já tem uma conta? " : "Novo na Kurio? "}
          <Link
            to={register ? "/login" : "/register"}
            search={{ redirect: safeReturn(search.redirect) }}
          >
            {register ? "Entre" : "Crie uma conta"}
          </Link>
        </p>
        <p className="aux-message" role="status">
          {auxMessage}
        </p>
        <details className="demo-credentials">
          <summary>Contas de demonstração</summary>
          <p>
            gabriel@example.test
            <br />
            marina@example.test
            <br />
            Senha fictícia: Demo@12345
          </p>
        </details>
      </div>
    </section>
  );
}

export function ProfilePage() {
  const session = useSession();
  const u = session.data?.user;
  if (!u) return <LoginRequired />;
  return (
    <ProfileForm
      key={u.id}
      name={u.name}
      email={u.email}
      avatar={u.avatar}
      username={
        u.username ?? u.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_")
      }
      ens={u.ens ?? ""}
      walletLabel={u.walletLabel ?? ""}
    />
  );
}
function ProfileForm(props: {
  name: string;
  email: string;
  avatar: string;
  username: string;
  ens: string;
  walletLabel: string;
}) {
  const client = useQueryClient();
  const [data, setData] = useState(props);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const update = useMutation({
    mutationFn: () => api.profile(data),
    onSuccess: (u) => {
      // A late profile response must never replace a newer account's session.
      client.setQueryData<Session>(sessionKey, (old) =>
        old?.user?.id === u.id ? { ...old, user: u } : old,
      );
      setMessage("Perfil atualizado.");
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const password = useMutation({
    mutationFn: () => api.password(oldPassword, newPassword),
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada.");
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  return (
    <section className="page account-page">
      <AccountNav />
      <h1>Perfil do colecionador</h1>
      <div className="account-grid profile-grid">
        <form
          className="form-panel profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
        >
          <h2>Dados do colecionador</h2>
          {data.avatar && (
            <img
              className="profile-avatar"
              src={data.avatar}
              alt="Seu avatar"
            />
          )}
          <label>
            Avatar (PNG, JPEG ou WebP, até 400 KB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 400 * 1024) {
                  setMessage("O avatar deve ter até 400 KB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () =>
                  setData((old) => ({ ...old, avatar: String(reader.result) }));
                reader.readAsDataURL(f);
              }}
            />
          </label>
          <label>
            Nome
            <input
              required
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              required
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </label>
          <label>
            Nome de usuário
            <input
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              minLength={3}
              maxLength={30}
              value={data.username}
              onChange={(e) => setData({ ...data, username: e.target.value })}
            />
          </label>
          <label>
            Nome ENS
            <input
              placeholder="nome.eth (opcional)"
              value={data.ens}
              onChange={(e) => setData({ ...data, ens: e.target.value })}
            />
          </label>
          <label>
            Apelido da carteira
            <input
              maxLength={60}
              placeholder="Opcional"
              value={data.walletLabel}
              onChange={(e) =>
                setData({ ...data, walletLabel: e.target.value })
              }
            />
          </label>
          <Button className="save-profile" disabled={update.isPending}>
            Salvar perfil
          </Button>
        </form>
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              setMessage(
                "A confirmação da nova senha deve ser igual à nova senha.",
              );
              return;
            }
            password.mutate();
          }}
        >
          <h2>Alterar senha</h2>
          <label>
            Senha atual
            <input
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </label>
          <label>
            Nova senha
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <Button disabled={password.isPending}>Alterar senha</Button>
        </form>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
export function AccountNav() {
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => replaceSession({ user: null, expiresAt: null }),
  });
  return (
    <nav className="account-nav" aria-label="Minha conta">
      <Link to="/profile">Dados do perfil</Link>
      <Link to="/wallets">Carteiras</Link>
      <Link to="/favorites" search={defaultFilters}>
        Lista de interesse
      </Link>
      <button onClick={() => logout.mutate()} disabled={logout.isPending}>
        Sair
      </button>
    </nav>
  );
}

export function LoginRequired() {
  return (
    <section className="empty">
      <h1>Entre para continuar</h1>
      <p>Sua sessão expirou. Seus itens e pedidos foram preservados.</p>
      <Button asChild>
        <Link to="/login" search={{ redirect: location.pathname }}>
          Entrar novamente
        </Link>
      </Button>
    </section>
  );
}
export function WalletsPage() {
  const session = useSession();
  const key = usePrivateKey("wallets");
  const client = useQueryClient();
  const wallets = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.wallets(signal),
    enabled: !!session.data?.user,
  });
  const empty = {
    label: "",
    address: "",
    network: "ethereum" as Network,
    primary: false,
  };
  const [form, setForm] = useState<Omit<Wallet, "id"> & { id?: string }>(empty);
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.saveWallet(form),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setMessage("Carteira salva.");
      setForm(empty);
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  if (!session.data?.user) return <LoginRequired />;
  return (
    <section className="page account-page">
      <AccountNav />
      <h1>Minhas carteiras</h1>
      <p className="muted">
        Até duas carteiras fictícias. Não informe chaves privadas ou frases de
        recuperação.
      </p>
      <div className="account-grid">
        <div>
          {wallets.isPending ? (
            <p>Carregando carteiras…</p>
          ) : wallets.isError ? (
            <p role="alert">{errorMessage(wallets.error)}</p>
          ) : (
            wallets.data?.map((w) => (
              <article key={w.id} className="wallet-card">
                <h2>
                  {w.label} {w.primary ? "· Principal" : ""}
                </h2>
                <p>{w.network}</p>
                <code>{w.address}</code>
                <Button variant="outline" onClick={() => setForm(w)}>
                  Editar {w.label}
                </Button>
              </article>
            ))
          )}
        </div>
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <h2>{form.id ? "Editar carteira" : "Nova carteira"}</h2>
          <label>
            Nome da carteira
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </label>
          <label>
            Endereço
            <input
              required
              pattern="0x[0-9a-fA-F]{40}"
              placeholder="0x…"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            Rede
            <select
              value={form.network}
              onChange={(e) =>
                setForm({ ...form, network: e.target.value as Network })
              }
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(e) => setForm({ ...form, primary: e.target.checked })}
            />
            Carteira principal
          </label>
          <Button disabled={mutation.isPending}>Salvar carteira</Button>
          {form.id && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(empty)}
            >
              Cancelar edição
            </Button>
          )}
        </form>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
