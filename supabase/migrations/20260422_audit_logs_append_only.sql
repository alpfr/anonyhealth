-- Phase 4: make audit_logs append-only from the server side only.
-- Clients write via the `log-audit` Edge Function (which uses the service role);
-- the `authenticated` role loses INSERT and never has UPDATE/DELETE.

alter table audit_logs add column if not exists ip text;
alter table audit_logs add column if not exists user_agent text;

alter table audit_logs
  add constraint audit_logs_event_type_check
  check (event_type in (
    'auth.sign_in',
    'auth.sign_up',
    'auth.sign_out',
    'profile.update',
    'health_log.create',
    'settings.change',
    'system.signup_trigger'
  ));

drop policy if exists "Authenticated users can insert audit logs" on audit_logs;

revoke insert, update, delete on audit_logs from authenticated, anon;
grant select on audit_logs to authenticated;

create or replace function public.log_signup_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, event_type, detail)
  values (new.id, 'system.signup_trigger', 'auth.users row inserted');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_audit on auth.users;
create trigger on_auth_user_created_audit
  after insert on auth.users
  for each row execute function public.log_signup_audit();
