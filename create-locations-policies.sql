-- ============================================================
-- Office Locations Table & Policies
-- Purpose: Persistent storage for office locations with RLS
-- ============================================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.office_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    radius INTEGER NOT NULL DEFAULT 100,
    address TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies
DROP POLICY IF EXISTS "Authenticated users can read office_locations" ON public.office_locations;
CREATE POLICY "Authenticated users can read office_locations"
    ON public.office_locations FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert office_locations" ON public.office_locations;
CREATE POLICY "Authenticated users can insert office_locations"
    ON public.office_locations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update office_locations" ON public.office_locations;
CREATE POLICY "Authenticated users can update office_locations"
    ON public.office_locations FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete office_locations" ON public.office_locations;
CREATE POLICY "Authenticated users can delete office_locations"
    ON public.office_locations FOR DELETE
    USING (auth.role() = 'authenticated');

-- 4. Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'office_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.office_locations;
    END IF;
END $$;
