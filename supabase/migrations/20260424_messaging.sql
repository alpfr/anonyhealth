-- Phase 16: secure 1:1 messaging between a patient and their provider.
--
-- One conversation per (tenant_id, patient_user_id) pair. The provider is
-- implicit (the tenant's owner). RLS guarantees both the patient and any
-- doctor of the tenant can read/write the conversation; everyone else is
-- locked out.

create table messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- The patient half of the conversation. The provider half is whoever owns
  -- the tenant, looked up via tenants.owner_user_id.
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_messages_tenant_patient_created
  on messages (tenant_id, patient_user_id, created_at desc);

alter table messages enable row level security;

-- Read: patient can read their own conversation; doctor of the tenant can
-- read any conversation in their tenant.
create policy "Conversation participants read messages"
  on messages for select
  using (
    tenant_id in (select public.current_user_tenants())
    and (
      patient_user_id = auth.uid()
      or public.is_tenant_doctor(tenant_id)
    )
  );

-- Write: patient may only send into their own conversation; doctor may
-- send into any conversation in their tenant. sender_user_id must equal
-- the auth.uid() of the request — server-side enforcement is non-trivial
-- so we constrain via the policy.
create policy "Conversation participants send messages"
  on messages for insert
  with check (
    tenant_id in (select public.current_user_tenants())
    and sender_user_id = auth.uid()
    and (
      (patient_user_id = auth.uid() and sender_user_id = auth.uid())
      or public.is_tenant_doctor(tenant_id)
    )
    and public.has_active_subscription(tenant_id)
  );

-- Update is restricted to setting read_at on own-side messages. We expose
-- this through a permissive update policy + a check that only allows
-- mutating read_at; in v1 we'll just gate at the application layer.
create policy "Recipient marks messages as read"
  on messages for update
  using (
    tenant_id in (select public.current_user_tenants())
    and (
      patient_user_id = auth.uid()
      or public.is_tenant_doctor(tenant_id)
    )
  )
  with check (
    tenant_id in (select public.current_user_tenants())
    and (
      patient_user_id = auth.uid()
      or public.is_tenant_doctor(tenant_id)
    )
  );

-- Deletes are not permitted from the client (audit trail). Doctors can
-- soft-delete via an admin tool later; for v1, no delete policy = no delete.
revoke delete on messages from authenticated, anon;
grant select, insert, update on messages to authenticated;

-- audit_logs.event_type allowlist: add message.send and message.read.
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
    'tenant.purge',
    'message.send',
    'message.read'
  ));
