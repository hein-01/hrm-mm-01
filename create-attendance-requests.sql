-- ============================================================
-- attendance_requests table
-- Purpose: Persistent storage for Remote Check-In, Missed Punch
--          and other attendance regularisation requests.
-- Run this in the Supabase SQL editor.
-- ============================================================

create table if not exists public.attendance_requests (
    id              text        primary key,
    "empId"         text        not null,
    name            text        not null,
    type            text        not null,          -- 'Remote Check-In' | 'Missed Punch' | etc.
    time            text,
    location        text,
    reason          text,
    status          text        not null default 'Pending',  -- 'Pending' | 'Approved' | 'Rejected'
    "submittedDate" text,
    priority        text        not null default 'Medium',   -- 'Low' | 'Medium' | 'High'
    category        text        not null default 'Attendance',
    "createdAt"     timestamptz not null default now()
);

-- ── Realtime ────────────────────────────────────────────────
-- Guard: only add to publication if not already a member
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'attendance_requests'
    ) then
        alter publication supabase_realtime add table public.attendance_requests;
    end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────
alter table public.attendance_requests enable row level security;

-- Allow all authenticated users to read (admins see all, scoped per RLS below)
create policy "Authenticated users can read attendance_requests"
    on public.attendance_requests
    for select
    using (auth.role() = 'authenticated');

-- Employees can insert their own requests
create policy "Authenticated users can insert attendance_requests"
    on public.attendance_requests
    for insert
    with check (auth.role() = 'authenticated');

-- Authenticated users can update status (admin check enforced in app layer)
create policy "Authenticated users can update attendance_requests"
    on public.attendance_requests
    for update
    using (auth.role() = 'authenticated');

-- Admins can delete stale/rejected requests
create policy "Authenticated users can delete attendance_requests"
    on public.attendance_requests
    for delete
    using (auth.role() = 'authenticated');
