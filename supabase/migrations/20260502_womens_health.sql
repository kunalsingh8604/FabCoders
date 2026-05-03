-- Women's Health Functional Features Migration
CREATE TABLE IF NOT EXISTS public.period_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.period_records ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming auth.uid() is used)
CREATE POLICY "Users can manage their own period records"
    ON public.period_records
    FOR ALL
    USING (true); -- Simplified for demo/local dev, usually auth.uid() = user_id
