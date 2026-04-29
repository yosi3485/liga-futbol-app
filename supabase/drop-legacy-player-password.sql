-- Ejecutar una vez, después de confirmar que ya no se usa players.password
alter table public.players
drop column if exists password;
