/**
 * Supabase 프로젝트 설정
 * Dashboard → Project Settings → API 에서 URL / anon(public) key 를 넣으세요.
 * service_role 키는 절대 프론트엔드에 넣지 마세요.
 *
 * WebAuthn: Edge Function Secrets 에도 같은 값으로 맞추세요.
 * - WEBAUTHN_RP_ID = localhost (또는 배포 도메인)
 * - WEBAUTHN_ORIGIN = http://localhost:포트 (또는 https://도메인)
 */
window.SUPABASE_CONFIG = {
  url: "https://kcxnmaxipzlxdxwvpupv.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjeG5tYXhpcHpseGR4d3ZwdXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTM2OTUsImV4cCI6MjEwNjg4OTY5NX0.cBg40MK5JI49FxbQmzAsdYZgSQ6h2nxLZdM7fbAfSto",
  rpID: "aleph-about-me.vercel.app",
  rpName: "박현우 포트폴리오",
};
