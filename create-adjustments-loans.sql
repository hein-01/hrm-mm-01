-- ==========================================
-- HRMS SaaS: Financial Modules Sync
-- Tables: adjustments, loans
-- ==========================================

-- 1. Create Adjustments Table
CREATE TABLE IF NOT EXISTS public.adjustments (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MMK',
    "effectiveMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "sourceLink" TEXT,
    "source" TEXT NOT NULL,
    "isImmutable" BOOLEAN DEFAULT false,
    "isTaxable" BOOLEAN DEFAULT false,
    "isSSBRelevant" BOOLEAN DEFAULT false,
    "priority" TEXT,
    "calculationBreakdown" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Loans Table
CREATE TABLE IF NOT EXISTS public.loans (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "principalAmount" NUMERIC NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyInstallment" NUMERIC NOT NULL,
    "disbursedDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "remainingBalance" NUMERIC NOT NULL,
    "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
    "schedule" JSONB DEFAULT '[]'::jsonb,
    "reason" TEXT,
    "requestedDate" TIMESTAMP WITH TIME ZONE,
    "priority" TEXT,
    "category" TEXT,
    "isPaused" BOOLEAN DEFAULT false,
    "interestRate" NUMERIC DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for development, restrict in production)
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.adjustments;
CREATE POLICY "Enable all actions for authenticated users" ON public.adjustments
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.loans;
CREATE POLICY "Enable all actions for authenticated users" ON public.loans
    FOR ALL USING (true);

-- 5. Add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'adjustments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE adjustments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'loans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE loans;
    END IF;
END $$;
