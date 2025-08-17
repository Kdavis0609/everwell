export type PgError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string | number;
  status?: number;
};

export const toPgError = (err: any): PgError => ({
  message: err?.message ?? err?.error ?? String(err),
  details: err?.details ?? err?.data?.details,
  hint: err?.hint ?? err?.data?.hint,
  code: err?.code ?? err?.status,
  status: err?.status,
});

export const logError = (label: string, err: any, extra?: Record<string, unknown>) => {
  const e = toPgError(err);
  // eslint-disable-next-line no-console
  console.error(`[${label}]`, { ...extra, ...e });
  return e;
};
