import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PinCard } from "@/components/PinCard";
import { UploadDialog } from "@/components/UploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { fetchPins, type Pin } from "@/lib/pins";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mural — banco de imagens e vídeos" },
      {
        name: "description",
        content:
          "Um mural colaborativo de imagens e vídeos: envie suas mídias, explore o feed e salve o que gostar.",
      },
      { property: "og:title", content: "Mural — banco de imagens e vídeos" },
      {
        property: "og:description",
        content: "Envie imagens e vídeos, explore o mural e salve suas inspirações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  const query = useQuery({
    queryKey: ["pins", user?.id ?? null],
    queryFn: () => fetchPins(user?.id ?? null),
    enabled: !loading,
  });

  const pins = useMemo(() => {
    const list = query.data ?? [];
    return list.filter((p) => {
      const okType = filter === "all" || p.media_type === filter;
      const term = q.trim().toLowerCase();
      const okTerm =
        !term ||
        p.title.toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term) ||
        p.author.toLowerCase().includes(term);
      return okType && okTerm;
    });
  }, [query.data, filter, q]);

  async function toggleLike(pin: Pin) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (pin.likedByMe) {
      await supabase.from("likes").delete().eq("pin_id", pin.id).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ pin_id: pin.id, user_id: user.id });
    }
    query.refetch();
  }

  async function remove(pin: Pin) {
    const { error } = await supabase.from("pins").delete().eq("id", pin.id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    await supabase.storage.from("media").remove([pin.storage_path]);
    toast.success("Publicação removida.");
    query.refetch();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-display text-2xl font-semibold text-primary">mural</span>

          <div className="relative order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, descrição ou autor"
              className="rounded-full bg-muted pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden gap-1 rounded-full bg-muted p-1 sm:flex">
              {(["all", "image", "video"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    filter === f ? "bg-card shadow-[var(--shadow-soft)]" : "text-muted-foreground"
                  }`}
                >
                  {f === "all" ? "Tudo" : f === "image" ? "Imagens" : "Vídeos"}
                </button>
              ))}
            </div>

            <UploadDialog userId={user?.id ?? null} onDone={() => query.refetch()} />

            {user ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sair"
                className="rounded-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  query.refetch();
                }}
              >
                <LogOut className="size-4" />
              </Button>
            ) : (
              <Button variant="ghost" className="rounded-full" onClick={() => navigate({ to: "/auth" })}>
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8">
        <h1 className="max-w-2xl text-3xl font-semibold sm:text-4xl">
          Tudo que te inspira, num só mural.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Envie imagens e vídeos, explore o que a comunidade publica e salve suas descobertas.
        </p>

        <div className="mt-8 masonry">
          {query.isLoading &&
            Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="masonry-item rounded-3xl"
                style={{ height: 180 + ((i * 67) % 220) }}
              />
            ))}

          {!query.isLoading &&
            pins.map((pin) => (
              <PinCard
                key={pin.id}
                pin={pin}
                isOwner={pin.user_id === user?.id}
                onToggleLike={toggleLike}
                onDelete={remove}
              />
            ))}
        </div>

        {!query.isLoading && pins.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center">
            <p className="text-lg font-semibold">Nada por aqui ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seja a primeira pessoa a publicar uma imagem ou vídeo.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
