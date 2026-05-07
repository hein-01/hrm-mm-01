-- ==========================================
-- HRMS SaaS: Bank Disbursements & Project Payments
-- Tables: disbursement_batches, project_payments
-- ==========================================

-- 1. Create Disbursement Batches Table
CREATE TABLE IF NOT EXISTS public.disbursement_batches (
    "id" TEXT PRIMARY KEY,
    "providerName" TEXT NOT NULL,
    "totalAmount" NUMERIC NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "disbursementDate" TEXT NOT NULL,
    "payrollMonth" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Project Payments Table
CREATE TABLE IF NOT EXISTS public.project_payments (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "hoursLogged" NUMERIC,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MMK',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "submittedDate" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'Medium',
    "category" TEXT DEFAULT 'Financial',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.disbursement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for development, restrict in production)
CREATE POLICY "Enable all actions for authenticated users" ON public.disbursement_batches FOR ALL USING (true);
CREATE POLICY "Enable all actions for authenticated users" ON public.project_payments FOR ALL USING (true);

-- 5. Add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'disbursement_batches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disbursement_batches;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'project_payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_payments;
    END IF;
END $$;
