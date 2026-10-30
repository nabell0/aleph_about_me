-- 과제 8 카드 4: 본인 패스키 삭제 권한
-- SQL Editor 에서 실행하세요. (passkeys.sql 이후)

grant delete on table public.passkeys to authenticated;

drop policy if exists "passkeys_delete_own" on public.passkeys;
create policy "passkeys_delete_own"
  on public.passkeys
  for delete
  to authenticated
  using (auth.uid() = user_id);
