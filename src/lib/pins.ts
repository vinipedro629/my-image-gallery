import { supabase } from "@/integrations/supabase/client";

export type Pin = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_type: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  url: string;
  author: string;
  likes: number;
  likedByMe: boolean;
};

export async function fetchPins(currentUserId?: string | null): Promise<Pin[]> {
  const { data, error } = await supabase
    .from("pins")
    .select("*, likes(user_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<
    Record<string, unknown> & {
      storage_path: string;
      user_id: string;
      likes: Array<{ user_id: string }>;
    }
  >;
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", authorIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const { data: signed } = await supabase.storage
    .from("media")
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      60 * 60 * 8,
    );

  const urlByPath = new Map<string, string>();
  (signed ?? []).forEach((s) => {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  });


  return rows.map((r) => ({
    id: r["id"] as string,
    user_id: r["user_id"] as string,
    title: (r["title"] as string) ?? "",
    description: (r["description"] as string | null) ?? null,
    media_type: (r["media_type"] as string) ?? "image",
    storage_path: r.storage_path,
    width: (r["width"] as number | null) ?? null,
    height: (r["height"] as number | null) ?? null,
    created_at: r["created_at"] as string,
    url: urlByPath.get(r.storage_path) ?? "",
    author: r.profiles?.display_name ?? "Alguém",
    likes: r.likes?.length ?? 0,
    likedByMe: !!currentUserId && (r.likes ?? []).some((l) => l.user_id === currentUserId),
  }));
}

export async function readMediaSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return await new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve({ width: v.videoWidth || 720, height: v.videoHeight || 1280 });
        v.onerror = () => resolve({ width: 720, height: 1280 });
        v.src = url;
      });
    }
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 1000 });
      img.onerror = () => resolve({ width: 800, height: 1000 });
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
