-- Create HRMS Assets table
CREATE TABLE IF NOT EXISTS public.hrms_assets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    model TEXT NOT NULL,
    "assigneeId" TEXT REFERENCES public.employees(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    "serialNumber" TEXT,
    "purchaseDate" TEXT,
    "purchaseValue" NUMERIC DEFAULT 0,
    "depreciationRate" NUMERIC DEFAULT 0,
    "lastAuditDate" TEXT NOT NULL,
    "expectedReturnDate" TEXT,
    "isDeductible" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.hrms_assets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON public.hrms_assets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.hrms_assets
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.hrms_assets
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.hrms_assets
    FOR DELETE TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hrms_assets;
