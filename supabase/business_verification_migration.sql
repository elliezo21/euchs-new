alter table public.profiles
  add column if not exists business_open_date date,
  add column if not exists business_verified_at timestamptz;

create or replace function public.guard_profile_verification()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon','authenticated') or public.is_admin_or_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.is_business_verified, false)
       or coalesce(new.verification_status, 'pending') = 'verified'
       or coalesce(new.tier, 'buyer') = 'business'
       or new.business_verified_at is not null then
      raise exception '사업자 인증 상태는 직접 지정할 수 없습니다';
    end if;
    return new;
  end if;

  if new.is_business_verified is distinct from old.is_business_verified
     or new.verification_status is distinct from old.verification_status
     or new.tier is distinct from old.tier
     or new.business_verified_at is distinct from old.business_verified_at then
    raise exception '사업자 인증 상태는 직접 변경할 수 없습니다';
  end if;

  if coalesce(old.is_business_verified, false)
     and (regexp_replace(coalesce(new.business_number,''), '[^0-9]', '', 'g')
            is distinct from regexp_replace(coalesce(old.business_number,''), '[^0-9]', '', 'g')
       or trim(coalesce(new.representative_name,'')) is distinct from trim(coalesce(old.representative_name,''))
       or new.business_open_date is distinct from old.business_open_date) then
    new.is_business_verified := false;
    new.verification_status  := 'pending';
    new.tier                 := 'buyer';
    new.business_verified_at := null;
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_profile_verification on public.profiles;
create trigger trg_guard_profile_verification
  before insert or update on public.profiles
  for each row execute function public.guard_profile_verification();
