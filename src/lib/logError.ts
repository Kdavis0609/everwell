export function logError(tag: string, err: unknown, ctx?: Record<string, unknown>) {
  const jsonErr =
    err && typeof err === 'object'
      ? JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)))
      : err;
  // eslint-disable-next-line no-console
  console.error(`[${tag}]`, { ctx, err: jsonErr });
  return { tag, ctx, err: jsonErr };
}
