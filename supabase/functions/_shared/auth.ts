import { createClient, type User, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }
  return createClient(url, key);
}

export async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;

    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonUnauthorized("로그인이 필요합니다."), user: null, client: null };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 없습니다.");
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return { error: jsonUnauthorized("유효하지 않은 세션입니다."), user: null, client: null };
  }

  return { error: null, user: data.user, client: userClient };
}

function jsonUnauthorized(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
