export function friendlyClerkError(err: any): string {
  const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message;
  return msg || "Beklenmeyen bir hata oluştu.";
}
