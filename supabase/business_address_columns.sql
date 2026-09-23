alter table public.profiles
  add column if not exists business_zipcode        text,
  add column if not exists business_address_road   text,
  add column if not exists business_address_jibun  text,
  add column if not exists business_address_detail text,
  add column if not exists business_address_en     text,
  add column if not exists business_address_detail_en text;
