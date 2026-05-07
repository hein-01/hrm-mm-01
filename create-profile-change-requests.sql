-- ==========================================
-- HRMS SaaS: Profile Change Requests Sync
-- Tables: profile_change_requests
-- ==========================================

-- 1. Create Profile Change Requests Table
CREATE TABLE IF NOT EXISTS public.profile_change_requests (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "avatar" TEXT,
    "category" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "oldValues" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "documentName" TEXT,
    "documentType" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    "rejectionReason" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Permissive for development, restrict in production)
CREATE POLICY "Enable all actions for authenticated users" ON public.profile_change_requests
    FOR ALL USING (true);

-- 4. Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE profile_change_requests;
