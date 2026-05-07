-- ==========================================
-- HRMS SaaS: Financial Modules Sync
-- Tables: ot_requests, expense_requests
-- ==========================================

-- 1. Create OT Requests Table
CREATE TABLE IF NOT EXISTS public.ot_requests (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftName" TEXT NOT NULL,
    "otHours" NUMERIC NOT NULL,
    "otType" TEXT NOT NULL,
    "reason" TEXT,
    "payoutAmount" NUMERIC NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "hasViolation" BOOLEAN DEFAULT false,
    "violationNote" TEXT,
    "effectiveMonth" TEXT,
    "requestedDate" TIMESTAMP WITH TIME ZONE,
    "priority" TEXT,
    "category" TEXT,
    "convertToToil" BOOLEAN DEFAULT false,
    "source" TEXT,
    "isConflict" BOOLEAN DEFAULT false,
    "conflictNote" TEXT,
    "biometricDeviceId" TEXT,
    "systemDetectedHours" NUMERIC,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Expense Requests Table
CREATE TABLE IF NOT EXISTS public.expense_requests (
    "id" TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "employeeName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MMK',
    "date" DATE NOT NULL,
    "description" TEXT,
    "attachments" JSONB DEFAULT '[]'::jsonb,
    "approverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "approvedBy" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.ot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Permissive for development, restrict in production)
CREATE POLICY "Enable all actions for authenticated users" ON public.ot_requests
    FOR ALL USING (true);

CREATE POLICY "Enable all actions for authenticated users" ON public.expense_requests
    FOR ALL USING (true);

-- 5. Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE ot_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_requests;

-- 6. Ensure Storage Bucket exists for expense receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;
