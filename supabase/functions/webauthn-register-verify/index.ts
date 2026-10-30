import {
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@11";
import type { RegistrationResponseJSON } from "npm:@simplewebauthn/server@11";
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

    const body = await req.json();
    const deviceName = String(body?.deviceName || "").trim();
    const credential = body?.credential as RegistrationResponseJSON | undefined;

    if (!deviceName) {
      return jsonResponse({ error: "패스키 이름이 필요합니다." }, 400);
    }
    if (!credential?.id || !credential?.response) {
      return jsonResponse({ error: "WebAuthn 등록 응답이 없습니다." }, 400);
    }

    const admin = getServiceClient();
    const { data: challengeRow, error: challengeError } = await admin
      .from("webauthn_challenges")
      .select("id, challenge, expires_at")
      .eq("user_id", user.id)
      .eq("purpose", "registration")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError) {
      return jsonResponse({ error: challengeError.message }, 500);
    }
    if (!challengeRow) {
      return jsonResponse({ error: "등록용 챌린지가 없습니다. 다시 시작하세요." }, 400);
    }
    if (new Date(challengeRow.expires_at).getTime() < Date.now()) {
      await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);
      return jsonResponse({ error: "챌린지가 만료되었습니다. 다시 등록하세요." }, 400);
    }

    const { rpID, origin } = getRpConfig(req);

    // 브라우저 표준 등록 응답만 검증 — 개인키는 응답에 포함되지 않음
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    // 사용이 끝난 챌린지는 즉시 삭제 (성공/실패 모두 재사용 방지)
    await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    if (!verification.verified || !verification.registrationInfo) {
      return jsonResponse({ error: "패스키 등록 검증에 실패했습니다." }, 400);
    }

    const info = verification.registrationInfo;
    const credentialID = info.credential.id;
    const publicKeyBytes = info.credential.publicKey;
    const counter = info.credential.counter;
    const transports = credential.response.transports ?? null;

    const credentialIdB64 =
      typeof credentialID === "string"
        ? credentialID
        : bufferToBase64URL(credentialID);

    const publicKeyB64 = bufferToBase64URL(publicKeyBytes);

    const { error: insertError } = await admin.from("passkeys").insert({
      user_id: user.id,
      credential_id: credentialIdB64,
      public_key: publicKeyB64,
      counter,
      device_name: deviceName,
      transports,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      passkey: {
        deviceName,
        credentialId: credentialIdB64,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});

function bufferToBase64URL(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
