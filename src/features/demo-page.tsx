import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { Button } from "../components/ui/button";
import type { Scenario } from "../lib/contracts";
export function DemoPage() {
  const query = useQuery({
    queryKey: ["demo-scenario"],
    queryFn: api.scenarios,
  });
  const client = useQueryClient();
  const [id, setId] = useState("nft-1");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Partial<Scenario>>({});
  const scenario = query.data ? { ...query.data, ...draft } : undefined;
  const patch = useMutation({
    mutationFn: (data: Partial<Scenario>) => api.setScenario(data),
    onMutate: (patch) => {
      const previous = client.getQueryData<Scenario>(["demo-scenario"]);
      client.setQueryData<Scenario>(["demo-scenario"], (current) => current ? { ...current, ...patch } : current);
      return { previous };
    },
    onSuccess: (data) => {
      client.setQueryData(["demo-scenario"], data);
      void client.invalidateQueries({ queryKey: ["nfts"] });
      setMessage("Cenário atualizado.");
    },
    onError: (error, _patch, context) => {
      setDraft({});
      if (context?.previous) client.setQueryData(["demo-scenario"], context.previous);
      setMessage(errorMessage(error));
    },
  });
  const updateScenario = (change: Partial<Scenario>) => {
    setMessage("");
    setDraft((current) => ({ ...current, ...change }));
    patch.mutate(change);
  };
  const action = useMutation({
    mutationFn: (action: string) => api.demo(action, id),
    onSuccess: (_data, name) => {
      setMessage("Ação executada na camada de mocks.");
      if (name === "reset") {
        localStorage.removeItem("forma.mock.cart.v1");
        for (const k of Object.keys(localStorage))
          if (k.startsWith("forma.attempt.")) localStorage.removeItem(k);
        location.assign("/");
      }
      if (name === "expire")
        void client.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  return (
    <section className="page">
      <h1>Laboratório de demonstração</h1>
      <p className="muted">
        Controles exclusivos de dados fictícios. Eventos passam pelo cliente
        Socket.IO; nenhuma chamada direta ao cache substitui os eventos.
      </p>
      {scenario && (
        <div className="account-grid">
          <div className="form-panel">
            <h2>Rede e operações</h2>
            <label>
              Latência
              <select
                value={scenario.latency}
                onChange={(e) =>
                  updateScenario({ latency: Number(e.target.value) })
                }
              >
                <option value={180}>Padrão · 180 ms</option>
                <option value={0}>Sem atraso</option>
                <option value={3000}>Lenta · 3 segundos</option>
                <option value={10000}>Timeout · 10 segundos</option>
              </select>
            </label>
            {(
              [
                ["connectionError", "Falha de conexão REST"],
                ["variableLatency", "Latência variável por busca"],
                ["catalogError", "Erro 503 no catálogo"],
                ["favoriteError", "Falha ao salvar favorito"],
                ["timeoutOrder", "Timeout após criar pedido"],
              ] as const
            ).map(([key, title]) => (
              <label className="checkbox-label" key={key}>
                <input
                  type="checkbox"
                  checked={scenario[key]}
                  onChange={(e) => updateScenario({ [key]: e.target.checked })}
                />
                {title}
              </label>
            ))}
            <label>
              Resultado do pagamento
              <select
                value={scenario.payment}
                onChange={(e) =>
                  updateScenario({
                    payment: e.target.value as Scenario["payment"],
                  })
                }
              >
                <option value="confirmed">Confirmado</option>
                <option value="rejected">Recusado</option>
              </select>
            </label>
            <label>
              Tempo de processamento
              <select
                value={scenario.orderDelay}
                onChange={(e) =>
                  updateScenario({ orderDelay: Number(e.target.value) })
                }
              >
                <option value={2500}>2,5 segundos</option>
                <option value={20000}>20 segundos</option>
              </select>
            </label>
          </div>
          <div className="form-panel">
            <h2>Eventos e sessão</h2>
            <label>
              Identificador do NFT
              <input value={id} onChange={(e) => setId(e.target.value)} />
            </label>
            <Button variant="outline" onClick={() => action.mutate("price")}>
              Alterar preço via Socket.IO
            </Button>
            <Button variant="outline" onClick={() => action.mutate("soldout")}>
              Esgotar edição via Socket.IO
            </Button>
            <Button
              variant="outline"
              onClick={() => action.mutate("duplicate")}
            >
              Emitir eventos duplicados
            </Button>
            <Button variant="outline" onClick={() => action.mutate("expire")}>
              Expirar sessão
            </Button>
            <Button onClick={() => action.mutate("reset")}>
              Restaurar cenário inicial
            </Button>
          </div>
        </div>
      )}
      <p role="status">{message}</p>
      <p className="muted">
        Cupom válido: FORMA10. Cupom expirado: EXPIRADO. Contas:
        gabriel@example.test e marina@example.test, senha Demo@12345. Reset
        restaura todos os dados fictícios deste navegador.
      </p>
    </section>
  );
}
