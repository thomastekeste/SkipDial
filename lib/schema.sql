-- Run this in your Supabase SQL editor to set up the database

-- Users table (synced from Clerk via webhook or on first visit)
create table if not exists users (
  id text primary key,                -- Clerk user ID
  email text,
  stripe_customer_id text,
  subscription_status text default 'none', -- none, active, past_due, canceled
  subscription_id text,
  plan text default 'none',            -- none, solo, team
  script_json jsonb default '[]'::jsonb, -- user's call script sections
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads table
create table if not exists leads (
  id bigint generated always as identity primary key,
  user_id text references users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  dob text default '',
  age integer,
  state text default '',
  status text default 'NEW LEAD',
  notes text default '',
  vm_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leads_user_id on leads(user_id);
create index if not exists idx_leads_status on leads(status);

-- Call sessions table
create table if not exists call_sessions (
  id bigint generated always as identity primary key,
  user_id text references users(id) on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  total_calls integer default 0,
  voicemails integer default 0,
  appointments integer default 0,
  sold integer default 0,
  callbacks integer default 0,
  bad_numbers integer default 0,
  not_interested integer default 0
);

create index if not exists idx_sessions_user_id on call_sessions(user_id);

-- Row Level Security
alter table users enable row level security;
alter table leads enable row level security;
alter table call_sessions enable row level security;

-- RLS policies: restrict rows to the owning user.
-- NOTE: All server-side queries use supabaseAdmin() (service role key) which
-- bypasses RLS. These policies are a defense-in-depth safety net in case the
-- anon client is ever used directly.

create policy "own_select" on users for select
  using (id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', ''));
create policy "own_update" on users for update
  using (id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', ''));

create policy "own_leads" on leads for all
  using (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', ''));

create policy "own_sessions" on call_sessions for all
  using (user_id = coalesce(current_setting('request.jwt.claims', true)::json->>'sub', ''));
