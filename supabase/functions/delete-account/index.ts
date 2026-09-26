// Deletes the calling user's account (Google Play requires in-app deletion).
// The user is taken from their own access token, never from the request body.
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function adminKey(): string | null {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through to the legacy key
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const url = Deno.env.get('SUPABASE_URL');
  const key = adminKey();
  if (!jwt || !url || !key) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);

  const userId = data.user.id;
  const del = await admin.auth.admin.deleteUser(userId); // profiles and cores cascade
  if (del.error) {
    console.error('delete-account', del.error.message);
    return json({ error: 'delete_failed' }, 500);
  }

  // Optional: also forget the RevenueCat customer (set REVENUECAT_SECRET_KEY as a function secret).
  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (rcKey) {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rcKey}` },
    });
    if (!r.ok && r.status !== 404) console.error('revenuecat delete', r.status);
  }
  return json({ deleted: true });
});
