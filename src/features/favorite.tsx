import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useSession, usePrivateKey } from "./session";
import { Button } from "../components/ui/button";
export function Favorite({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const session = useSession();
  const key = usePrivateKey("favorites");
  const q = useQueryClient();
  const [message, setMessage] = useState("");
  const favorites = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.favorites(signal),
    enabled: !!session.data?.user,
  });
  const active = favorites.data?.includes(id) ?? false;
  const mutation = useMutation({
    mutationFn: (value: boolean) => api.favorite(id, value),
    onMutate: async (value) => {
      setMessage("");
      await q.cancelQueries({ queryKey: key });
      const previous = q.getQueryData<string[]>(key);
      q.setQueryData<string[]>(key, (old) =>
        value
          ? [...(old ?? []).filter((x) => x !== id), id]
          : (old ?? []).filter((x) => x !== id),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      q.setQueryData(key, context?.previous);
      setMessage(errorMessage(error));
    },
    onSuccess: (data) => {
      q.setQueryData(key, data);
      void q.invalidateQueries({ queryKey: ["nfts", session.data?.user?.id] });
      setMessage(data.includes(id) ? "Favorito salvo." : "Favorito removido.");
    },
  });
  return (
    <div className={`favorite-control ${compact ? "favorite-compact" : ""}`}>
      {session.data?.user ? (
        <Button
          variant="outline"
          aria-pressed={active}
          aria-label={active ? "Favoritado" : "Favoritar"}
          disabled={mutation.isPending || favorites.isPending}
          onClick={() => mutation.mutate(!active)}
        >
          <Heart size={16} fill={active ? "currentColor" : "none"} />
          {!compact && (active ? "Favoritado" : "Favoritar")}
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link
            to="/login"
            search={{ redirect: `/nft/${id}` }}
            aria-label="Entrar para favoritar"
          >
            {compact ? <Heart size={17} /> : "Entrar para favoritar"}
          </Link>
        </Button>
      )}
      <p className={compact ? "sr-only" : ""} role="status">
        {message}
      </p>
    </div>
  );
}
