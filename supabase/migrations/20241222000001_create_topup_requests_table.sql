create table if not exists public.topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null check (amount > 0),
  method text not null default 'bank_transfer',
  bank_name text,
  destination_account text,
  sender_account text,
  proof_url text,
  reference_no text,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected')),
  note text,
  created_at timestamptz default now(),
  verified_at timestamptz,
  verified_by uuid
);

alter publication supabase_realtime add table topup_requests;

CREATE INDEX idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX idx_topup_requests_status ON topup_requests(status);
CREATE INDEX idx_topup_requests_created_at ON topup_requests(created_at DESC);