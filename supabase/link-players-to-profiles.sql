-- 1) Normaliza emails en players
update public.players
set email = lower(trim(email))
where email is not null;

-- 2) Enlaza profiles.player_id por coincidencia de email
update public.profiles p
set player_id = pl.id
from public.players pl
where p.player_id is null
  and p.email is not null
  and lower(trim(p.email)) = lower(trim(pl.email));

-- 3) Reporte de perfiles autenticados sin jugador enlazado
select id, email, role
from public.profiles
where player_id is null
order by created_at desc;

-- 4) (Opcional) detectar emails duplicados en players
select lower(trim(email)) as email_normalizado, count(*) as total
from public.players
where email is not null and trim(email) <> ''
group by lower(trim(email))
having count(*) > 1;
