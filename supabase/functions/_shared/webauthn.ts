export function getRpConfig(req: Request) {
  const rpID =
    Deno.env.get("WEBAUTHN_RP_ID") ||
    new URL(req.headers.get("origin") || "http://localhost").hostname ||
    "localhost";

  const rpName = Deno.env.get("WEBAUTHN_RP_NAME") || "Portfolio Passkey";

  const origin =
    Deno.env.get("WEBAUTHN_ORIGIN") ||
    req.headers.get("origin") ||
    `http://${rpID}`;

  return { rpID, rpName, origin };
}
