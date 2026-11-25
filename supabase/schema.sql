-- Optional persistence for Payload.
-- The app uses this only when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
-- The service role bypasses RLS. Do not put that key in the browser.
-- With RLS on and no policies, the anon key cannot read deliveries.

create table if not exists public.deliveries (
  id text primary key,
  sender_name text not null,
  message text not null,
  personality text not null,
  suit_color text not null,
  visor_color text not null,
  accent_color text not null,
  chat_count integer not null default 0,
  replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.deliveries enable row level security;
