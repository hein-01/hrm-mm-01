-- ============================================================
-- Field Force Monitoring Tables
-- Purpose: Real-time tracking of agents and persistent GPS logs.
-- ============================================================

-- 1. field_agents table (Current State)
create table if not exists public.field_agents (
    id                  text        primary key,
    "empId"             text        not null,
    name                text        not null,
    role                text        not null,
    avatar              text,
    status              text        not null default 'Offline', -- 'Online' | 'Offline'
    "locationName"      text,
    "mapPosition"       jsonb       not null default '{"x": 0, "y": 0}'::jsonb,
    gps                 jsonb       not null default '{"lat": 0, "lng": 0}'::jsonb,
    history             jsonb       not null default '[]'::jsonb, -- Trail/History subset
    "lastUpdate"        text,
    "routeAssigned"     text,
    "batteryLevel"      numeric     not null default 100,
    alert               text        not null default 'None',
    "isTrackingActive"  boolean     not null default false,
    "currentSpeed"      numeric     not null default 0,
    "createdAt"         timestamptz not null default now()
);

-- 2. gps_logs table (Historical Records)
create table if not exists public.gps_logs (
    id                  text        primary key,
    "agentId"           text        not null references public.field_agents(id) on delete cascade,
    lat                 numeric     not null,
    lng                 numeric     not null,
    timestamp           text        not null, -- ISO String
    "startTime"         text,
    "endTime"           text,
    "durationMins"      numeric,
    speed               numeric     not null default 0,
    "isDwellPoint"      boolean     not null default false,
    "batteryLevel"      numeric,
    "onLine"            boolean     not null default true,
    "createdAt"         timestamptz not null default now()
);

-- ── Realtime ────────────────────────────────────────────────
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'field_agents'
    ) then
        alter publication supabase_realtime add table public.field_agents;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'gps_logs'
    ) then
        alter publication supabase_realtime add table public.gps_logs;
    end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────
alter table public.field_agents enable row level security;
alter table public.gps_logs enable row level security;

-- Policies
drop policy if exists "Authenticated users can read field_agents" on public.field_agents;
create policy "Authenticated users can read field_agents"
    on public.field_agents for select
    using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update field_agents" on public.field_agents;
create policy "Authenticated users can update field_agents"
    on public.field_agents for update
    using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read gps_logs" on public.gps_logs;
create policy "Authenticated users can read gps_logs"
    on public.gps_logs for select
    using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert gps_logs" on public.gps_logs;
create policy "Authenticated users can insert gps_logs"
    on public.gps_logs for insert
    with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update gps_logs" on public.gps_logs;
create policy "Authenticated users can update gps_logs"
    on public.gps_logs for update
    using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert field_agents" on public.field_agents;
create policy "Authenticated users can insert field_agents"
    on public.field_agents for insert
    with check (auth.role() = 'authenticated');

-- ── Seed Data ──────────────────────────────────────────────
insert into public.field_agents (id, "empId", name, role, status, "locationName", "mapPosition", gps, "batteryLevel", alert, "isTrackingActive", "currentSpeed")
values 
    ('FA-001', 'EMP-001', 'Kyaw Zayar', 'Sales - Downtown', 'Online', 'Downtown Yangon', '{"x": 45, "y": 40}', '{"lat": 16.7840, "lng": 96.1519}', 85, 'None', true, 0),
    ('FA-002', 'EMP-004', 'Hla Hla', 'Checking client site', 'Online', 'Hlaing Township', '{"x": 55, "y": 30}', '{"lat": 16.8550, "lng": 96.1100}', 92, 'None', true, 0),
    ('FA-003', 'EMP-023', 'Aung Kyaw', 'Delivery - Kamaryut', 'Online', 'Kamaryut', '{"x": 35, "y": 60}', '{"lat": 16.8400, "lng": 96.1250}', 45, 'None', true, 0),
    ('FA-004', 'EMP-112', 'Thidar Aye', 'Sales rep', 'Online', 'Yankin', '{"x": 60, "y": 45}', '{"lat": 16.8050, "lng": 96.1750}', 78, 'None', true, 0),
    ('FA-005', 'EMP-024', 'Moe Moe', 'Field Inspector', 'Offline', 'Tamwe', '{"x": 40, "y": 55}', '{"lat": 16.7950, "lng": 96.1900}', 10, 'Low Battery Warning', false, 0),
    ('FA-006', 'EMP-099', 'Ko Min', 'Delivery', 'Offline', 'Bahan', '{"x": 50, "y": 50}', '{"lat": 16.7900, "lng": 96.1650}', 55, 'GPS Signal Lost', false, 0),
    ('FA-007', 'EMP-1299', 'Min Thant', 'Logistics', 'Online', 'Insein', '{"x": 25, "y": 25}', '{"lat": 16.9300, "lng": 96.1000}', 100, 'Fake GPS Detected', true, 0)
on conflict (id) do nothing;
