-- Phase 12: 30-day purge of tenants that cancelled their subscription.
--
-- When Stripe reports a subscription as `canceled`, the webhook sets
-- tenants.deleted_at. This job hard-deletes those tenants after the grace
-- period, which cascades to all per-tenant data (health_logs, patient_profiles,
-- audit_logs, user_tenants, subscriptions, patient_invites).
--
-- Doctors can export their data at any time via the export-tenant Edge
-- Function; this job does not send a reminder email (out of scope for v1).

create extension if not exists pg_cron;

-- Also extend the audit_logs event_type allowlist so phase-11's phi.read and
-- phase-12's tenant.export / tenant.purge events are accepted.
alter table audit_logs drop constraint if exists audit_logs_event_type_check;
alter table audit_logs
  add constraint audit_logs_event_type_check
  check (event_type in (
    'auth.sign_in',
    'auth.sign_up',
    'auth.sign_out',
    'profile.update',
    'health_log.create',
    'settings.change',
    'system.signup_trigger',
    'phi.read',
    'tenant.export',
    'tenant.purge'
  ));

-- The purge runs as the postgres superuser via pg_cron, bypassing RLS.
-- It records a final audit event with a null tenant_id (the tenant itself is
-- about to be deleted) so operators can see the history.
create or replace function public.purge_expired_tenants()
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  purged integer := 0;
  rec record;
begin
  for rec in
    select id from tenants
    where deleted_at is not null
      and deleted_at < (now() - interval '30 days')
  loop
    insert into audit_logs (user_id, event_type, detail)
    values (null, 'tenant.purge', format('Purged tenant %s', rec.id));

    delete from tenants where id = rec.id;
    purged := purged + 1;
  end loop;

  return purged;
end;
$$;

revoke all on function public.purge_expired_tenants() from public, authenticated, anon;

-- Run daily at 03:17 UTC.
select cron.schedule(
  'purge-expired-tenants-daily',
  '17 3 * * *',
  $$ select public.purge_expired_tenants(); $$
);
