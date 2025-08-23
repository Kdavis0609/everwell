import { createSupabaseBrowser } from '@/lib/supabase/client';
import { logError } from '@/lib/errors';

export type SchemaMap = {
  profiles: {
    key: 'id' | 'user_id';
    hasAvatarUrl: boolean;
  };
  measurements: {
    hasMetricSlug: boolean; // most envs: false
  };
};

const LOCAL_KEY = 'everwell:schema-map:v1';
let cached: SchemaMap | null = null;

async function columnExists(table: string, column: string) {
  const supabase = createSupabaseBrowser();
  try {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) return true;
    if (/column .* does not exist/i.test(error.message ?? '')) return false;
    logError('schema.columnExists.unknown', error, { table, column });
    return true;
  } catch (e) {
    const msg = (e as any)?.message ?? '';
    if (/column .* does not exist/i.test(msg)) return false;
    logError('schema.columnExists.catch', e, { table, column });
    return true;
  }
}

async function detect(): Promise<SchemaMap> {
  const [hasId, hasUserId, hasAvatarUrl, hasMetricSlug] = await Promise.all([
    columnExists('profiles', 'id'),
    columnExists('profiles', 'user_id'),
    columnExists('profiles', 'avatar_url'),
    columnExists('measurements', 'metric_slug'),
  ]);

  const key: 'id' | 'user_id' = hasId ? 'id' : 'user_id';

  const map: SchemaMap = {
    profiles: { key, hasAvatarUrl },
    measurements: { hasMetricSlug },
  };
  try {
    if (typeof window !== 'undefined') localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
  return map;
}

export async function getSchema(): Promise<SchemaMap> {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      try { cached = JSON.parse(raw) as SchemaMap; } catch { /* noop */ }
    }
  }
  if (!cached) cached = await detect();
  return cached;
}

export function resetSchemaCache() {
  cached = null;
  if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_KEY);
}

export async function profileKey() {
  return (await getSchema()).profiles.key;
}
export async function profileHasAvatar() {
  return (await getSchema()).profiles.hasAvatarUrl;
}
export async function measurementsUseSlug() {
  return (await getSchema()).measurements.hasMetricSlug;
}
