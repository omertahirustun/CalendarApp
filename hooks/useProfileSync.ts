import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { upsertProfile } from "../lib/api";

/**
 * Giris yapan kullanicinin adini profiles tablosuna yazar; katilimci
 * secicisinin (AttendeePicker) "bilinen kullanicilar" listesi buradan gelir.
 * Bildirim izninden bagimsiz calisir (usePushNotifications'in aksine).
 */
export function useProfileSync(enabled: boolean) {
  const { userId } = useAuth();
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || null;

  useEffect(() => {
    if (!enabled || !userId || !displayName) return;
    upsertProfile(userId, displayName).catch((e) => {
      console.warn("[profil] Kayit basarisiz:", e);
    });
  }, [enabled, userId, displayName]);
}
