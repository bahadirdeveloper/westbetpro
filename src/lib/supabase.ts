/**
 * Shared Supabase REST API helpers
 * Uses direct REST API to bypass RLS issues with JS client
 * Used by: api/cron/live-scores/route.ts, api/opportunities/route.ts, api/live-alerts/route.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getSupabaseConfig() {
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

export async function supabaseSelect(table: string, params: string): Promise<any[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function supabaseUpdate(
  table: string,
  id: string,
  data: Record<string, any>
): Promise<{ ok: boolean; status: number }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, status: 0 };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    const rows = await res.json();
    return { ok: Array.isArray(rows) && rows.length > 0, status: res.status };
  }
  return { ok: false, status: res.status };
}

export async function supabaseInsert(
  table: string,
  data: Record<string, any> | Record<string, any>[],
  upsert: boolean = false
): Promise<{ ok: boolean; status: number; data?: any[] }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, status: 0 };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    const rows = await res.json();
    return { ok: true, status: res.status, data: rows };
  }
  return { ok: false, status: res.status };
}
