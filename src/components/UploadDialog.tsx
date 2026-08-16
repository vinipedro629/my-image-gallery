import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { readMediaSize } from "@/lib/pins";

export function UploadDialog({ userId, onDone }: { userId: string | null; onDone: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  async function submit() {
    if (!userId) return;
    if (!file) {
      toast.error("Escolha uma imagem ou vídeo.");
      return;
    }
    setBusy(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const size = await readMediaSize(file);
      const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error } = await supabase.from("pins").insert({
        user_id: userId,
        title: title.trim() || file.name,
        description: description.trim() || null,
        media_type: isVideo ? "video" : "image",
        storage_path: path,
        width: size.width,
        height: size.height,
      });
      if (error) throw error;

      toast.success("Publicado!");
      setFile(null);
      setTitle("");
      setDescription("");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <Button onClick={() => navigate({ to: "/auth" })} className="rounded-full">
        <Plus /> Publicar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus /> Publicar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
          <DialogDescription>Envie uma imagem ou vídeo para o mural.</DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-primary/50">
          {previewUrl ? (
            file?.type.startsWith("video/") ? (
              <video src={previewUrl} className="max-h-64 rounded-xl" controls />
            ) : (
              <img src={previewUrl} alt="Prévia do arquivo" className="max-h-64 rounded-xl" />
            )
          ) : (
            <>
              <UploadCloud className="size-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Clique para escolher um arquivo (JPG, PNG, GIF, MP4…)
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dê um nome" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte algo sobre essa mídia"
            />
          </div>
        </div>

        <Button onClick={submit} disabled={busy} className="rounded-full">
          {busy ? "Enviando…" : "Publicar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
