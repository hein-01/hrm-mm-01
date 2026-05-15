-- ============================================================
-- Shift Templates Policies & Realtime
-- Purpose: Enable CRUD for shift templates and realtime updates.
-- ============================================================

-- 1. Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- 2. Add Policies
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON public.shifts;
CREATE POLICY "Authenticated users can read shifts"
    ON public.shifts FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert shifts" ON public.shifts;
CREATE POLICY "Authenticated users can insert shifts"
    ON public.shifts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shifts" ON public.shifts;
CREATE POLICY "Authenticated users can update shifts"
    ON public.shifts FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete shifts" ON public.shifts;
CREATE POLICY "Authenticated users can delete shifts"
    ON public.shifts FOR DELETE
    USING (auth.role() = 'authenticated');

-- 3. Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
    END IF;
END $$;
