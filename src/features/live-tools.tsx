import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { Button } from "../components/ui/button";
export function LiveTools({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const action = useMutation({
    mutationFn: (action: string) => api.demo(action, id),
    onSuccess: () =>
      setMessage("Alteração emitida pelo mock. Aguarde o evento Socket.IO."),
    onError: (e) => setMessage(errorMessage(e)),
  });
  return (
    <details className="live-tools">
      <summary>Testar alteração em tempo real (simulação)</summary>
      <p>
        Recurso: {id}. Esses controles alteram a API simulada e emitem eventos
        pelo socket.
      </p>
      <div>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate("price")}
        >
          Aumentar preço em 0,1 ETH
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate("soldout")}
        >
          Esgotar edição
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate("duplicate")}
        >
          Reenviar evento duplicado
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate("old")}
        >
          Emitir evento antigo
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => action.mutate("disconnect")}
        >
          Interromper conexão simulada
        </Button>
      </div>
      <p role="status">{message}</p>
    </details>
  );
}
