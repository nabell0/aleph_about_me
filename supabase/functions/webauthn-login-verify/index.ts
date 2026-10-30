import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@11";
import type { AuthenticationResponseJSON } from "npm:@simplewebauthn/server@11";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";
import { base64URLToBuffer } from "../_shared/encoding.ts";
import { getRpConfig } from "../_shared/webauthn.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const credential = body?.credential as AuthenticationResponseJSON | undefined;

    if (!credential?.id || !credential?.response) {
      return jsonResponse({ error: "WebAuthn 인증 응답이 없습니다." }, 400);
    }

    const admin = getServiceClient();

    const { data: passkey, error: passkeyError } = await admin
      .from("passkeys")
      .select("id, user_id, credential_id, public_key, counter, transports")
      .eq("credential_id", credential.id)
      .maybeSingle();

    if (passkeyError) {
      return jsonResponse({ error: passkeyError.message }, 500);
    }
    if (!passkey) {
      return jsonResponse({ error: "등록되지 않은 패스키입니다." }, 401);
    }

    // 최신 로그인 챌린지 조회 후 즉시 원자적 폐기 (Replay 재사용 차단)
    const { data: challengeRow, error: challengeError } = await admin
      .from("webauthn_challenges")
      .select("id, challenge, expires_at")
      .eq("user_id", passkey.user_id)
      .eq("purpose", "authentication")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError) {
      return jsonResponse({ error: challengeError.message }, 500);
    }

    if (!challengeRow) {
      return jsonResponse(
        { error: "유효하지 않거나 이미 사용된 챌린지입니다" },
        401,
      );
    }

    const { data: consumed, error: consumeError } = await admin
      .from("webauthn_challenges")
      .delete()
      .eq("id", challengeRow.id)
      .select("id, challenge, expires_at")
      .maybeSingle();

    if (consumeError) {
      return jsonResponse({ error: consumeError.message }, 500);
    }

    // 이미 다른 요청이 먼저 폐기했거나, 없는 챌린지 → 재사용 거절
    if (!consumed) {
      return jsonResponse(
        { error: "유효하지 않거나 이미 사용된 챌린지입니다" },
        401,
      );
    }

    if (new Date(consumed.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        { error: "유효하지 않거나 이미 사용된 챌린지입니다" },
        401,
      );
    }

    const { rpID, origin } = getRpConfig(req);

    let verification;
    try {
      // DB에 저장된 공개키로 서명을 엄격 검증 — 무조건 통과 금지
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: consumed.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
        credential: {
          id: passkey.credential_id,
          publicKey: base64URLToBuffer(passkey.public_key),
          counter: Number(passkey.counter) || 0,
          transports: passkey.transports ?? undefined,
        },
      });
    } catch (verifyErr) {
      const message =
        verifyErr instanceof Error ? verifyErr.message : "서명 검증 실패";
      return jsonResponse({ error: message }, 401);
    }

    if (!verification.verified) {
      return jsonResponse({ error: "패스키 서명 검증에 실패했습니다." }, 401);
    }

    const newCounter = verification.authenticationInfo.newCounter;
    await admin
      .from("passkeys")
      .update({ counter: newCounter })
      .eq("id", passkey.id);

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      passkey.user_id,
    );
    if (userError || !userData.user?.email) {
      return jsonResponse({ error: "사용자 정보를 불러오지 못했습니다." }, 500);
    }

    // 검증 성공 → 로그인 세션(JWT) 발급용 일회용 토큰
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      return jsonResponse(
        { error: linkError?.message || "세션 토큰 발급에 실패했습니다." },
        500,
      );
    }

    return jsonResponse({
      ok: true,
      email: userData.user.email,
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
