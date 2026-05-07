-- ============================================================
-- Shift Planner Tables
-- Purpose: Persistent storage for shift assignments and 
--          published week schedules.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- 1. shift_assignments table
create table if not exists public.shift_assignments (
    id              text        primary key,
    "empId"         text        not null,
    date            text        not null,          -- ISO date string (YYYY-MM-DD)
    "shiftId"       text        not null,
    "modifiedByHr"  boolean     not null default false,
    reason          text,
    "adminId"       text,
    "oldShiftId"    text,
    "customStart"   text,
    "customEnd"     text,
    "workType"      text,                          -- 'Regular' | 'Overtime'
    "createdAt"     timestamptz not null default now()
);

-- 2. published_weeks table
create table if not exists public.published_weeks (
    id              text        primary key,
    "weekKey"       text        not null unique,   -- ISO date string for week start
    "publishedBy"   text        not null,
    "createdAt"     timestamptz not null default now()
);

-- ── Realtime ────────────────────────────────────────────────
-- Guard: only add to publication if not already a member
do $$
begin
    -- Add shift_assignments
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'shift_assignments'
    ) then
        alter publication supabase_realtime add table public.shift_assignments;
    end if;

    -- Add published_weeks
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'published_weeks'
    ) then
        alter publication supabase_realtime add table public.published_weeks;
    end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────
alter table public.shift_assignments enable row level security;
alter table public.published_weeks enable row level security;

-- Allow all authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read shift_assignments" ON public.shift_assignments;
create policy "Authenticated users can read shift_assignments"
    on public.shift_assignments for select
    using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read published_weeks" ON public.published_weeks;
create policy "Authenticated users can read published_weeks"
    on public.published_weeks for select
    using (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update (Admins usually handle this, but for this migration we allow it)
DROP POLICY IF EXISTS "Authenticated users can insert shift_assignments" ON public.shift_assignments;
create policy "Authenticated users can insert shift_assignments"
    on public.shift_assignments for insert
    with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shift_assignments" ON public.shift_assignments;
create policy "Authenticated users can update shift_assignments"
    on public.shift_assignments for update
    using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert published_weeks" ON public.published_weeks;
create policy "Authenticated users can insert published_weeks"
    on public.published_weeks for insert
    with check (auth.role() = 'authenticated');

-- Allow deletion (for clearing schedules)
DROP POLICY IF EXISTS "Authenticated users can delete shift_assignments" ON public.shift_assignments;
create policy "Authenticated users can delete shift_assignments"
    on public.shift_assignments for delete
    using (auth.role() = 'authenticated');
