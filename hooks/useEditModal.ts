import { useCallback, useState } from "react";

/**
 * Bir CRUD form modalinin ac/kapa + duzenlenen kaydi tutan ortak state'i.
 * (app/(tabs)/index.tsx, agenda.tsx, projects.tsx'te tekrar eden ayni kalip.)
 *
 * Kasitli olarak sadece bunu kapsar: kaydetme/silme is mantigi (API cagrisi,
 * hata yonetimi) her ekranda farkli oldugu icin burada degil, kullanildigi
 * yerde kalir.
 */
export function useEditModal<T>() {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setVisible(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  return { visible, editing, openCreate, openEdit, close };
}
