-- ==========================================
-- HRMS SaaS: Payroll Run Sync
-- Tables: payroll_groups, payroll_records
-- ==========================================

-- 1. Create Payroll Groups Table
CREATE TABLE IF NOT EXISTS public.payroll_groups (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "payrollCycle" TEXT NOT NULL,
    "proRatingDenominator" INTEGER NOT NULL,
    "cutoffs" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "paymentDate" TEXT NOT NULL,
    "affectedEmployees" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "approverId" TEXT,
    "approverName" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Payroll Records Table
CREATE TABLE IF NOT EXISTS public.payroll_records (
    "id" TEXT PRIMARY KEY,
    "groupId" TEXT NOT NULL REFERENCES public.payroll_groups(id) ON DELETE CASCADE,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "salary" NUMERIC NOT NULL DEFAULT 0,
    "additions" NUMERIC NOT NULL DEFAULT 0,
    "deductions" NUMERIC NOT NULL DEFAULT 0,
    "ssb" NUMERIC NOT NULL DEFAULT 0,
    "employerSsb" NUMERIC DEFAULT 0,
    "pit" NUMERIC NOT NULL DEFAULT 0,
    "netPay" NUMERIC NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "alerts" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "detailedBreakdowns" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "biometricOTHours" NUMERIC,
    "biometricAttendanceDays" NUMERIC,
    "biometricDeviceId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for development, restrict in production)
CREATE POLICY "Enable all actions for authenticated users" ON public.payroll_groups FOR ALL USING (true);
CREATE POLICY "Enable all actions for authenticated users" ON public.payroll_records FOR ALL USING (true);

-- 5. Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_records;
