-- 과제 8 카드 2: WebAuthn 챌린지 보관 + 패스키(공개키) 저장
-- SQL Editor 에서 실행하세요. (private_profile.sql 이후)

-- 등록/인증용 챌린지 (검증 전까지 서버에 잠시 보관)
create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists webauthn_challenges_user_purpose_idx
  on public.webauthn_challenges (user_id, purpose);

comment on table public.webauthn_challenges is
  'WebAuthn 챌린지. Edge Function(service role)만 읽고 쓰며, 검증 후 삭제.';

-- 패스키: 공개키 + credential ID + 사용자 지정 이름 (개인키는 저장하지 않음)
create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  counter bigint not null default 0,
  device_name text not null,
  transports text[] null,
  created_at timestamptz not null default now(),
  constraint passkeys_credential_id_key unique (credential_id)
);

create index if not exists passkeys_user_id_idx on public.passkeys (user_id);

comment on table public.passkeys is
  '등록된 패스키. public_key / credential_id 만 보관. private key 없음.';

-- 클라이언트는 챌린지에 직접 접근 불가
revoke all on table public.webauthn_challenges from anon, authenticated, public;
alter table public.webauthn_challenges enable row level security;

-- 본인 패스키 조회·삭제만 허용. 삽입/갱신은 Edge Function(service role)
revoke all on table public.passkeys from anon, public;
revoke insert, update on table public.passkeys from authenticated;
grant select, delete on table public.passkeys to authenticated;
alter table public.passkeys enable row level security;
alter table public.passkeys force row level security;

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

-- 만료된 챌린지 정리용 (선택 실행)
-- delete from public.webauthn_challenges where expires_at < now();
