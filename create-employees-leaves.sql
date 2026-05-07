-- ============================================================
-- Employees & Leave Requests Tables
-- Purpose: Persistent storage for HR core modules.
-- ============================================================

-- 1. Employees Table (Hardened with all required columns)
create table if not exists public.employees (
    id                  text        primary key,
    name                text        not null,
    email               text,
    phone               text,
    dept                text        not null,
    role                text        not null,
    status              text        not null default 'Active',
    "joinDate"          text,
    avatar              text,
    township            text,
    "nrcNumber"         text,
    "ssbNumber"         text,
    "taxId"             text,
    mobile              text,
    "hasCriticalRiskFlag" boolean    default false,
    "baseSalary"        numeric,
    reliefs             jsonb       default '{"spouse": false, "parentsCount": 0}'::jsonb,
    "shiftId"           text,
    "bankName"          text,
    "accountNumber"     text,
    "bankBranch"        text,
    "bankBranchCode"    text,
    "leaveBalances"     jsonb       default '{"Casual": 6, "Medical": 30, "Earned": 0}'::jsonb,
    "policyId"          text,
    "officeLocation"    text,
    "officeCoords"      jsonb,
    "reportingManagerId" text,
    "supervisorId"      text,
    "autoAttendanceEnabled" boolean  default false,
    "separationReason"  text,
    "separationDate"    text,
    "eligibleForRehire" boolean,
    "createdAt"         timestamptz not null default now()
);

-- 2. Leave Requests Table
create table if not exists public.leave_requests (
    id                  text        primary key,
    "empId"             text        not null references public.employees(id) on delete cascade,
    name                text,
    dept                text,
    type                text        not null,
    "durationStr"       text,
    "totalDays"         numeric     not null default 0,
    "startDate"         text        not null,
    "endDate"           text        not null,
    status              text        not null default 'Pending', -- 'Pending' | 'Approved' | 'Rejected'
    "relieverId"        text,
    "relieverName"      text,
    reason              text,
    submitted           text,       -- ISO String
    "hasCert"           boolean     default false,
    "isAdminOverride"   boolean     default false,
    "certFileName"      text,
    "rejectionReason"   text,
    "approvedBy"        text,
    "approvedAt"        text,
    "rejectedBy"        text,
    "rejectedAt"        text,
    priority            text        default 'Medium', -- 'High' | 'Medium' | 'Low'
    category            text        default 'Attendance',
    "createdAt"         timestamptz not null default now()
);

-- ── Realtime ────────────────────────────────────────────────
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'employees'
    ) then
        alter publication supabase_realtime add table public.employees;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'leave_requests'
    ) then
        alter publication supabase_realtime add table public.leave_requests;
    end if;
end $$;

-- ── Row Level Security ──────────────────────────────────────
alter table public.employees enable row level security;
alter table public.leave_requests enable row level security;

-- Policies for employees
drop policy if exists "Enable read for authenticated users" on public.employees;
create policy "Enable read for authenticated users" on public.employees for select using (true);

drop policy if exists "Enable insert for authenticated users" on public.employees;
create policy "Enable insert for authenticated users" on public.employees for insert with check (true);

drop policy if exists "Enable update for authenticated users" on public.employees;
create policy "Enable update for authenticated users" on public.employees for update using (true);

drop policy if exists "Enable delete for authenticated users" on public.employees;
create policy "Enable delete for authenticated users" on public.employees for delete using (true);

-- Policies for leave_requests
drop policy if exists "Enable read for authenticated users" on public.leave_requests;
create policy "Enable read for authenticated users" on public.leave_requests for select using (true);

drop policy if exists "Enable insert for authenticated users" on public.leave_requests;
create policy "Enable insert for authenticated users" on public.leave_requests for insert with check (true);

drop policy if exists "Enable update for authenticated users" on public.leave_requests;
create policy "Enable update for authenticated users" on public.leave_requests for update using (true);

drop policy if exists "Enable delete for authenticated users" on public.leave_requests;
create policy "Enable delete for authenticated users" on public.leave_requests for delete using (true);
