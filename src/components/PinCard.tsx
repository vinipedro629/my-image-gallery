import { Heart, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pin } from "@/lib/pins";

export function PinCard({
  pin,
  isOwner,
  onToggleLike,
  onDelete,
}: {
  pin: Pin;
  isOwner: boolean;
  onToggleLike: (pin: Pin) => void;
  onDelete: (pin: Pin) => void;
}) {
  const ratio = pin.width && pin.height ? pin.height / pin.width : 1.25;

  return (
    <article className="masonry-item group overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-pin)]">
      <div className="relative bg-muted" style={{ aspectRatio: `1 / ${Math.min(Math.max(ratio, 0.6), 1.9)}` }}>
        {pin.media_type === "video" ? (
          <>
            <video
              src={pin.url}
              className="size-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-foreground/70 px-2 py-1 text-xs text-background">
              <Play className="size-3" /> vídeo
            </span>
          </>
        ) : (
          <img src={pin.url} alt={pin.title} loading="lazy" className="size-full object-cover" />
        )}

        {isOwner && (
          <Button
            size="icon"
            variant="secondary"
            aria-label="Excluir publicação"
            onClick={() => onDelete(pin)}
            className="absolute right-3 top-3 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{pin.title}</h3>
          {pin.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{pin.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">por {pin.author}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleLike(pin)}
          aria-label="Curtir"
          className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          <Heart className={`size-4 ${pin.likedByMe ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          {pin.likes}
        </button>
      </div>
    </article>
  );
}
