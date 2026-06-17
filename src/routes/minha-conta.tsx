import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Database,
  Loader2,
  LogOut,
  Mail,
  MessageSquarePlus,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundX,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AccountAreaNav } from "@/components/account/AccountAreaNav";
import { ConfirmActionDialog } from "@/components/feedback/ConfirmActionDialog";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { deleteMyAccount, signInWithGoogle, signOut, useSession } from "@/lib/auth/session";
import { clearTravelAnswers } from "@/lib/recommendations/answers-storage";
import { clearEditingItinerary } from "@/lib/roteiro/editing-state";
import { clearSavedPlaces } from "@/lib/roteiro/saved-places";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta e meus dados — Roteiro do Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinhaContaPage,
});

function MinhaContaPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const user = session?.user;
  const displayName = getDisplayName(user?.user_metadata, user?.email);

  const handleLogin = async () => {
    setConnecting(true);
    try {
      await signInWithGoogle("/minha-conta");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Falha no login da conta:", error);
      toast.error("Não conseguimos iniciar o login", {
        description: "Tente novamente em instantes.",
      });
      setConnecting(false);
    }
  };

  const handleSignOut = async () => {
    setLeaving(true);
    try {
      await signOut();
      toast.success("Você saiu da sua conta");
      navigate({ to: "/" });
    } catch {
      toast.error("Não conseguimos encerrar sua sessão agora.");
      setLeaving(false);
    }
  };

  const handleClearLocalData = () => {
    clearSavedPlaces();
    clearEditingItinerary();
    clearTravelAnswers();
    toast.success("Dados deste navegador removidos", {
      description: "Preferências e roteiro em edição foram limpos deste dispositivo.",
    });
  };

  const handleDeleteAccount = async () => {
    await deleteMyAccount();
    clearSavedPlaces();
    clearEditingItinerary();
    clearTravelAnswers();
    toast.success("Conta e dados excluídos", {
      description: "Sua sessão foi encerrada e seus roteiros foram removidos.",
    });
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
        >
          <ArrowLeft size={16} /> Voltar para a home
        </Link>

        <div className="mt-8 animate-fade-up">
          <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sea backdrop-blur">
            ☀️ Sua área
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">
            Minha conta e meus dados
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink/65 md:text-lg">
            Consulte sua conta, entenda os dados usados no serviço e escolha o que deseja manter.
          </p>
          {session ? <AccountAreaNav active="account" /> : null}
        </div>

        {loading ? (
          <AccountStatus message="Carregando sua conta..." />
        ) : !session || !user ? (
          <LoginGate connecting={connecting} onLogin={handleLogin} />
        ) : (
          <div className="mt-10 space-y-6 animate-fade-up">
            <section className="rounded-3xl bg-white p-6 shadow-soft md:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-sun font-display text-2xl font-extrabold text-ink shadow-coral">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-sea">
                    Conta conectada
                  </p>
                  <h2 className="mt-1 truncate font-display text-2xl font-extrabold text-ink">
                    {displayName}
                  </h2>
                  {user.email ? (
                    <p className="mt-1 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-ink/55">
                      <Mail size={15} className="shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={leaving}
                  className="press inline-flex items-center justify-center gap-2 rounded-full bg-sand-soft px-5 py-2.5 text-sm font-bold text-ink hover:bg-sand sm:ml-auto"
                >
                  {leaving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  {leaving ? "Saindo..." : "Sair da conta"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-gradient-sun p-6 shadow-coral md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/40 text-ink">
                    <MessageSquarePlus size={22} />
                  </div>
                  <h2 className="mt-4 font-display text-xl font-extrabold text-ink">
                    Contribua com a comunidade
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink/75">
                    Deixe sua opinião, sugira lugares, conte preços reais e compartilhe fotos. Com
                    seu nome ou anônimo — você decide.
                  </p>
                </div>
                <Link
                  to="/contribuir"
                  className="press inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-bold text-white hover:bg-sea sm:ml-auto"
                >
                  Contribuir
                </Link>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <DataCard
                icon={<UserRound size={20} />}
                title="Dados da conta"
                description="Nome e e-mail vêm da sua conta Google e são usados para autenticação."
              />
              <DataCard
                icon={<Database size={20} />}
                title="Roteiros salvos"
                description="Os roteiros ficam vinculados à sua conta para você acessar e editar depois."
              />
              <DataCard
                icon={<ShieldCheck size={20} />}
                title="Preferências de viagem"
                description="As respostas ajudam a personalizar sugestões e ficam associadas apenas ao roteiro salvo."
              />
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun/25 text-coral">
                  <Trash2 size={20} />
                </div>
                <h2 className="mt-4 font-display text-lg font-extrabold text-ink">
                  Dados deste navegador
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">
                  Limpe preferências, lugares selecionados e o roteiro atualmente em edição neste
                  dispositivo.
                </p>
                <button
                  type="button"
                  onClick={handleClearLocalData}
                  className="mt-4 text-sm font-bold text-sea hover:text-coral"
                >
                  Limpar dados deste navegador
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-coral/20 bg-white/75 p-6 shadow-soft backdrop-blur md:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-coral">
                Controle da conta
              </p>
              <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-xl">
                  <h2 className="font-display text-xl font-extrabold text-ink">
                    Excluir conta e dados permanentemente
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink/60">
                    Esta opção remove sua conta e todos os roteiros vinculados. Use somente quando
                    não quiser mais manter seus dados no Roteiro do Sol.
                  </p>
                </div>
                <ConfirmActionDialog
                  trigger={
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-coral/30 px-5 py-2.5 text-sm font-bold text-coral transition-colors hover:bg-coral-soft/60"
                    >
                      <UserRoundX size={16} />
                      Excluir conta
                    </button>
                  }
                  eyebrow="Privacidade e conta"
                  icon={<UserRoundX size={24} />}
                  title="Excluir sua conta?"
                  description={
                    <>
                      Todos os seus roteiros e dados vinculados serão removidos permanentemente.{" "}
                      <strong className="text-ink">Esta ação não pode ser desfeita.</strong>
                    </>
                  }
                  confirmLabel="Excluir conta"
                  pendingLabel="Excluindo conta..."
                  errorMessage="Não conseguimos excluir sua conta agora. Tente novamente em instantes."
                  onConfirm={handleDeleteAccount}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function DataCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-soft text-sea">
        {icon}
      </div>
      <h2 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
    </div>
  );
}

function LoginGate({ connecting, onLogin }: { connecting: boolean; onLogin: () => void }) {
  return (
    <div className="mt-12 rounded-3xl bg-white/85 px-6 py-14 text-center shadow-soft backdrop-blur animate-fade-up">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-sun text-2xl shadow-coral">
        <UserRound size={24} />
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold text-ink">
        Entre para acessar sua conta
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-ink/65">
        Faça login com Google para consultar seus roteiros e gerenciar seus dados.
      </p>
      <button
        type="button"
        onClick={onLogin}
        disabled={connecting}
        className="press mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg disabled:opacity-60"
      >
        {connecting ? <Loader2 size={16} className="animate-spin" /> : null}
        {connecting ? "Entrando..." : "Continuar com Google"}
      </button>
    </div>
  );
}

function AccountStatus({ message }: { message: string }) {
  return (
    <div className="mt-12 rounded-3xl bg-white/80 px-6 py-12 text-center shadow-soft backdrop-blur">
      <Loader2 size={24} className="mx-auto animate-spin text-sea" />
      <p className="mt-4 font-bold text-ink/60">{message}</p>
    </div>
  );
}

function getDisplayName(metadata: Record<string, unknown> | undefined, email?: string): string {
  const metadataName = metadata?.full_name ?? metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  if (email) return email.split("@")[0] || "Viajante";
  return "Viajante";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
