-- 과제 8 카드 5: 최종 보안 점검용 RLS 강화
-- SQL Editor 에서 한 번 실행하세요.

-- ── private_profile ─────────────────────────────────────────
alter table public.private_profile enable row level security;
alter table public.private_profile force row level security;

revoke all on table public.private_profile from anon, public;
revoke insert, update, delete on table public.private_profile from authenticated;
grant select on table public.private_profile to authenticated;

drop policy if exists "private_profile_select_own" on public.private_profile;
create policy "private_profile_select_own"
  on public.private_profile
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ── passkeys ────────────────────────────────────────────────
alter table public.passkeys enable row level security;
alter table public.passkeys force row level security;

revoke all on table public.passkeys from anon, public;
revoke insert, update on table public.passkeys from authenticated;
grant select, delete on table public.passkeys to authenticated;

drop policy if exists "passkeys_select_own" on public.passkeys;
create policy "passkeys_select_own"
  on public.passkeys
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "passkeys_delete_own" on public.passkeys;
create policy "passkeys_delete_own"
  on public.passkeys
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── webauthn_challenges (클라이언트 직접 접근 불가) ──────────
alter table public.webauthn_challenges enable row level security;
alter table public.webauthn_challenges force row level security;

revoke all on table public.webauthn_challenges from anon, authenticated, public;
-- 정책 없음 + revoke → 브라우저/anon/authenticated 는 챌린지 테이블 접근 불가
-- Edge Function(service_role)만 읽고 씀
