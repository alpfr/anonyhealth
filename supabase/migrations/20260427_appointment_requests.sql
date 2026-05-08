-- Phase 21: built-in appointment requests.
--
-- Patient submits a request (preferred date + window + reason + urgency).
-- Provider sees an inbox and confirms / counter-proposes / declines.
-- Email notifications are sent server-side from the send-appointment-email
-- Edge Function; this table is just the durable record.

create table appointment_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,

  -- Patient request fields
  preferred_date date not null,
  preferred_window text not null check (preferred_window in ('morning','afternoon','evening')),
  reason text not null check (length(reason) between 1 and 2000),
  urgency text not null check (urgency in ('routine','this_week','asap')),

  -- Provider response fields (filled when status changes)
  status text not null default 'requested'
    check (status in ('requested','confirmed','counter_proposed','declined','cancelled')),
  proposed_at timestamptz,           -- confirmed time or counter-proposal
  provider_note text check (provider_note is null or length(provider_note) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_appt_req_tenant_status_created
  on appointment_requests (tenant_id, status, created_at desc);
create index idx_appt_req_patient_created
  on appointment_requests (patient_user_id, created_at desc);

alter table appointment_requests enable row level security;

-- Patient can read their own requests; doctor of the tenant can read all
-- requests for their tenant.
create policy "Participants read appointment requests"
  on appointment_requests for select
  using (
    tenant_id in (select public.current_user_tenants())
    and (
      patient_user_id = auth.uid()
      or public.is_tenant_doctor(tenant_id)
    )
  );

-- Patient creates their own request. Doctor cannot create on patient's behalf
-- in v1 (keeps the audit trail clear).
create policy "Patient creates own request"
  on appointment_requests for insert
  with check (
    tenant_id in (select public.current_user_tenants())
    and patient_user_id = auth.uid()
    and public.has_active_subscription(tenant_id)
  );

-- Doctor updates status / proposed_at / provider_note. Patient may cancel
-- their own request (status -> cancelled) but the application layer enforces
-- which fields each side can write — RLS just gates the row.
create policy "Doctor updates tenant requests"
  on appointment_requests for update
  using (public.is_tenant_doctor(tenant_id))
  with check (public.is_tenant_doctor(tenant_id));

create policy "Patient cancels own request"
  on appointment_requests for update
  using (patient_user_id = auth.uid())
  with check (patient_user_id = auth.uid());

revoke delete on appointment_requests from authenticated, anon;
grant select, insert, update on appointment_requests to authenticated;

-- Trigger to keep updated_at fresh.
create or replace function public.touch_appointment_request()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger trg_touch_appointment_request
  before update on appointment_requests
  for each row execute function public.touch_appointment_request();

-- Audit allowlist
alter table audit_logs drop constraint if exists audit_logs_event_type_check;
alter table audit_logs
  add constraint audit_logs_event_type_check
  check (event_type in (
    'auth.sign_in',
    'auth.sign_up',
    'auth.sign_out',
    'profile.update',
    'profile.create',
    'health_log.create',
    'settings.change',
    'system.signup_trigger',
    'phi.read',
    'tenant.export',
    'tenant.purge',
    'message.send',
    'message.read',
    'appointment.request',
    'appointment.confirm',
    'appointment.counter',
    'appointment.decline',
    'appointment.cancel'
  ));
