-- ============================================================
-- OT and Expense Tables
-- Purpose: Persistent storage for Overtime and Expense requests.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- 1. ot_requests table
create table if not exists public.ot_requests (
    id                      text        primary key,
    "empId"                 text        not null,
    name                    text        not null,
    dept                    text        not null,
    date                    text        not null,
    "shiftName"             text        not null,
    "otHours"               numeric     not null,
    "otType"                text        not null, -- 'Weekday 1.5x' | 'Rest Day 2.0x' | 'Holiday 2.0x'
    reason                  text,
    "payoutAmount"          numeric     not null,
    status                  text        not null default 'Pending', -- 'Pending' | 'Approved' | 'Rejected'
    "hasViolation"          boolean     not null default false,
    "violationNote"         text,
    "effectiveMonth"        text        not null,
    "requestedDate"         text        not null,
    priority                text        not null default 'Medium',  -- 'High' | 'Medium' | 'Low'
    category                text        not null default 'Attendance',
    "convertToToil"         boolean     not null default false,
    source                  text        not null default 'Web',     -- 'Mobile' | 'Web' | 'Biometric'
    "isConflict"            boolean     not null default false,
    "conflictNote"          text,
    "biometricDeviceId"     text,
    "systemDetectedHours"   numeric,
    "approvedBy"            text,
    "approvedAt"            text,
    "createdAt"             timestamptz not null default now()
);

-- 2. expense_requests table
create table if not exists public.expense_requests (
    id                      text        primary key,
    "employeeId"            text        not null,
    "employeeName"          text        not null,
    "categoryId"            text        not null,
    amount                  numeric     not null,
    currency                text        not null default 'MMK',
    date                    text        not null,
    description             text,
    attachments             text[]      not null default '{}',
    "approverId"            text,
    status                  text        not null default 'Pending', -- 'Pending' | 'Approved' | 'Rejected' | 'Processed'
    "rejectionReason"       text,
    "approvedAt"            text,
    "approvedBy"            text,
    "createdAt"             timestamptz not null default now()
);

-- ── Realtime ────────────────────────────────────────────────
-- Guard: only add to publication if not already a member
do $$
begin
    -- Add ot_requests
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ot_requests'
    ) then
        alter publication supabase_realtime add table public.ot_requests;
    end if;

    -- Add expense_requests
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'expense_requests'
    ) then
        alter publication supabase_realtime add table public.expense_requests;
    end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────
alter table public.ot_requests enable row level security;
alter table public.expense_requests enable row level security;

-- Allow all authenticated users to read
DROP POLICY IF EXISTS "Authenticated users can read ot_requests" ON public.ot_requests;
create policy "Authenticated users can read ot_requests"
    on public.ot_requests for select
    using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read expense_requests" ON public.expense_requests;
create policy "Authenticated users can read expense_requests"
    on public.expense_requests for select
    using (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update
DROP POLICY IF EXISTS "Authenticated users can insert ot_requests" ON public.ot_requests;
create policy "Authenticated users can insert ot_requests"
    on public.ot_requests for insert
    with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update ot_requests" ON public.ot_requests;
create policy "Authenticated users can update ot_requests"
    on public.ot_requests for update
    using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert expense_requests" ON public.expense_requests;
create policy "Authenticated users can insert expense_requests"
    on public.expense_requests for insert
    with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update expense_requests" ON public.expense_requests;
create policy "Authenticated users can update expense_requests"
    on public.expense_requests for update
    using (auth.role() = 'authenticated');

-- Allow deletion
DROP POLICY IF EXISTS "Authenticated users can delete ot_requests" ON public.ot_requests;
create policy "Authenticated users can delete ot_requests"
    on public.ot_requests for delete
    using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete expense_requests" ON public.expense_requests;
create policy "Authenticated users can delete expense_requests"
    on public.expense_requests for delete
    using (auth.role() = 'authenticated');
