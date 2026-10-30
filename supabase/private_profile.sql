-- 과제 8 카드 1: 비공개 프로필 + RLS
-- Supabase SQL Editor 에서 실행하세요.

create table if not exists public.private_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_notes text not null default '',
  target_companies text not null default '',
  reflection text not null default '',
  updated_at timestamptz not null default now(),
  constraint private_profile_user_id_key unique (user_id)
);

comment on table public.private_profile is
  '포트폴리오 비공개 영역. 인증된 소유자만 읽기.';

-- anon 은 테이블에 접근 불가 → 비로그인 SELECT 시 401/403
revoke all on table public.private_profile from anon, public;
revoke insert, update, delete on table public.private_profile from authenticated;
grant select on table public.private_profile to authenticated;

alter table public.private_profile enable row level security;
alter table public.private_profile force row level security;

drop policy if exists "private_profile_select_own" on public.private_profile;
create policy "private_profile_select_own"
  on public.private_profile
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 프론트엔드에는 insert/update/delete 권한 없음 (타인·본인 변조 차단)


-- 시드: Auth → Users 에서 본인 user_id 확인 후 실행
-- insert into public.private_profile (user_id, project_notes, target_companies, reflection)
-- values (
--   'YOUR_AUTH_USER_UUID',
--   '네트워크 실험실 메모 / Docker 네트워킹 정리',
--   '토스 · 카카오 · 네이버 · 라인',
--   '이번 주는 RLS와 인증 경계를 실제로 검증하는 데 집중했다.'
-- );
