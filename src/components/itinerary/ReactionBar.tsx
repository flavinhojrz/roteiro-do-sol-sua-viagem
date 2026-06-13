import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getVisitorId } from "@/lib/roteiro/visitor-id";
import {
  clearReaction,
  emptyCounts,
  getReactionCounts,
  REACTION_META,
  REACTION_TYPES,
  setReaction,
  type ReactionCounts,
  type ReactionType,
} from "@/lib/supabase/reactions";
import { cn } from "@/lib/utils";

function localKey(itineraryId: string) {
  return `roteiro-do-sol:reaction:${itineraryId}`;
}

function readLocalReaction(itineraryId: string): ReactionType | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(localKey(itineraryId));
    return value && (REACTION_TYPES as readonly string[]).includes(value)
      ? (value as ReactionType)
      : null;
  } catch {
    return null;
  }
}

function writeLocalReaction(itineraryId: string, reaction: ReactionType | null) {
  if (typeof window === "undefined") return;
  try {
    if (reaction) window.localStorage.setItem(localKey(itineraryId), reaction);
    else window.localStorage.removeItem(localKey(itineraryId));
  } catch {
    // Ignora falhas de storage — a reação ainda é registrada no Supabase.
  }
}

export function ReactionBar({ itineraryId }: { itineraryId: string }) {
  const queryClient = useQueryClient();
  const [mine, setMine] = useState<ReactionType | null>(() => readLocalReaction(itineraryId));

  const countsQuery = useQuery({
    queryKey: ["reaction-counts", itineraryId],
    queryFn: () => getReactionCounts(itineraryId),
  });
  const counts = countsQuery.data ?? emptyCounts();

  const mutation = useMutation({
    mutationFn: async (next: ReactionType | null) => {
      const visitorId = getVisitorId(itineraryId);
      if (!visitorId) throw new Error("Identificador local indisponível.");
      if (next) await setReaction(itineraryId, visitorId, next);
      else await clearReaction(itineraryId, visitorId);
    },
    onMutate: async (next) => {
      // Atualização otimista dos contadores + marca local.
      await queryClient.cancelQueries({ queryKey: ["reaction-counts", itineraryId] });
      const previousCounts =
        queryClient.getQueryData<ReactionCounts>(["reaction-counts", itineraryId]) ?? emptyCounts();
      const previousMine = mine;

      const optimistic = { ...previousCounts };
      if (previousMine) optimistic[previousMine] = Math.max(0, optimistic[previousMine] - 1);
      if (next) optimistic[next] = optimistic[next] + 1;

      queryClient.setQueryData(["reaction-counts", itineraryId], optimistic);
      setMine(next);
      writeLocalReaction(itineraryId, next);

      return { previousCounts, previousMine };
    },
    onError: (error, _next, context) => {
      if (import.meta.env.DEV) {
        // Mantém a causa real no console em desenvolvimento (sem mostrar ao visitante).
        console.error("Falha ao registrar reação:", error);
      }
      // Reverte em caso de falha.
      if (context) {
        queryClient.setQueryData(["reaction-counts", itineraryId], context.previousCounts);
        setMine(context.previousMine);
        writeLocalReaction(itineraryId, context.previousMine);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reaction-counts", itineraryId] });
    },
  });

  const handleClick = (reaction: ReactionType) => {
    if (mutation.isPending) return; // evita spam de cliques rápidos
    // Clicar na mesma reação remove; clicar em outra troca.
    mutation.mutate(mine === reaction ? null : reaction);
  };

  return (
    <section className="mt-14 rounded-3xl bg-white p-6 text-center shadow-soft md:p-8">
      <h2 className="font-display text-xl font-extrabold text-ink md:text-2xl">
        Qual vibe esse roteiro te passou?
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink/60 md:text-base">
        Reaja e mostre para quem montou esse roteiro o que você achou.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {REACTION_TYPES.map((reaction) => {
          const meta = REACTION_META[reaction];
          const selected = mine === reaction;
          return (
            <button
              key={reaction}
              type="button"
              aria-pressed={selected}
              disabled={mutation.isPending}
              onClick={() => handleClick(reaction)}
              className={cn(
                "press inline-flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-extrabold transition-all disabled:opacity-70",
                selected
                  ? "border-coral bg-coral-soft/60 text-coral shadow-coral"
                  : "border-transparent bg-sand-soft/70 text-ink hover:-translate-y-0.5 hover:shadow-soft",
              )}
            >
              <span className="text-base">{meta.emoji}</span>
              {meta.label}
              <span
                className={cn(
                  "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                  selected ? "bg-coral text-white" : "bg-white text-ink/60",
                )}
              >
                {counts[reaction]}
              </span>
            </button>
          );
        })}
      </div>

      {countsQuery.isError ? (
        <p className="mt-4 text-xs text-ink/45">
          Não conseguimos carregar as reações agora, mas você ainda pode reagir.
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="mt-4 text-xs font-bold text-coral">
          Não conseguimos registrar sua reação. Tente de novo em instantes.
        </p>
      ) : null}
    </section>
  );
}
