import { useCallback, useEffect, useState } from "react";
import { getSupabase, getAccessToken } from "../lib/supabase";

interface Identifiable {
  id: string;
}

type Fetcher<T> = (userId: string) => Promise<T[]>;

/**
 * Bir tablo icin initial fetch + postgres_changes realtime subscription yonetir.
 * INSERT/UPDATE/DELETE eventleri local state'e aninda yansitilir,
 * unmount'ta channel temizlenir (memory leak onleme).
 */
export function useRealtimeTable<T extends Identifiable>(
  table: string,
  userId: string | null | undefined,
  fetcher: Fetcher<T>,
  sortFn?: (a: T, b: T) => number
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sort = useCallback(
    (rows: T[]): T[] => (sortFn ? [...rows].sort(sortFn) : rows),
    [sortFn]
  );

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await fetcher(userId);
      setItems(sort(rows));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri alınamadı");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sort]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    (async () => {
      await refetch();
      if (active) setLoading(false);
    })();

    const sb = getSupabase();
    // Her hook instance'i icin benzersiz kanal: ayni tabloyu dinleyen birden fazla
    // ekran olursa (orn. Takvim + Ajanda) ayni kanali paylasmaya calismasin.
    const channelName = `${table}-${userId.slice(-12)}-${Math.random().toString(36).slice(2, 8)}`;

    // RLS'li realtime icin guncel JWT'yi kanala uygula
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) sb.realtime.setAuth(token);
      } catch {
        // token alinamazsa accessToken callback devreye girer
      }
    })();

    const channel = sb
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          setItems((prev) => {
            let next = prev;
            if (payload.eventType === "INSERT") {
              next = [payload.new as T, ...prev];
            } else if (payload.eventType === "UPDATE") {
              next = prev.map((it) =>
                it.id === (payload.new as T).id ? (payload.new as T) : it
              );
            } else if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Identifiable).id;
              next = prev.filter((it) => it.id !== oldId);
            }
            return sort(next);
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, userId]);

  return { items, loading, error, refetch, setItems };
}
