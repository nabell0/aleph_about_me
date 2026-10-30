import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@11";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { findUserByEmail, getServiceClient } from "../_shared/auth.ts";
import { getRpConfig } from "../_shared/webauthn.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: "이메일이 필요합니다." }, 400);
    }

    const admin = getServiceClient();
    const user = await findUserByEmail(admin, email);
    if (!user) {
      return jsonResponse({ error: "등록된 계정을 찾을 수 없습니다." }, 404);
    }

    const { data: passkeys, error: passkeyError } = await admin
      .from("passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (passkeyError) {
      return jsonResponse({ error: passkeyError.message }, 500);
    }
    if (!passkeys?.length) {
      return jsonResponse(
        { error: "이 계정에 등록된 패스키가 없습니다. 먼저 패스키를 등록하세요." },
        400,
      );
    }

    const { rpID } = getRpConfig(req);

    // 서버에서 매번 새로운 로그인용 챌린지 생성
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: passkeys.map((row) => ({
        id: row.credential_id,
        type: "public-key" as const,
        transports: row.transports ?? undefined,
      })),
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await admin
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("purpose", "authentication");

    const { error: insertError } = await admin.from("webauthn_challenges").insert({
      user_id: user.id,
      challenge: options.challenge,
      purpose: "authentication",
      expires_at: expiresAt,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ options, userId: user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
