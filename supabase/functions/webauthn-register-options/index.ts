import {
  generateRegistrationOptions,
} from "npm:@simplewebauthn/server@11";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, requireUser } from "../_shared/auth.ts";
import { getRpConfig } from "../_shared/webauthn.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { error, user } = await requireUser(req);
    if (error || !user) return error!;

    const { rpID, rpName } = getRpConfig(req);
    const admin = getServiceClient();

    const { data: existing, error: listError } = await admin
      .from("passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (listError) {
      return jsonResponse({ error: listError.message }, 500);
    }

    // 동일 기기 중복 등록 방지: 이미 가진 credential_id 를 excludeCredentials 로 전달
    const excludeCredentials = (existing ?? []).map((row) => ({
      id: row.credential_id,
      type: "public-key" as const,
      transports: row.transports ?? undefined,
    }));

    // 서버에서 매번 다른 무작위 챌린지 생성
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email ?? user.id,
      userDisplayName: user.email ?? "user",
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // 검증 끝날 때까지 DB에 잠시 보관
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await admin
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("purpose", "registration");

    const { error: insertError } = await admin.from("webauthn_challenges").insert({
      user_id: user.id,
      challenge: options.challenge,
      purpose: "registration",
      expires_at: expiresAt,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({
      options,
      excludedCount: excludeCredentials.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
