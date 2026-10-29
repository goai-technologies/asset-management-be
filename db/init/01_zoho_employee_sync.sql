-- Zoho People sync support: stable external id for upserts
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS zoho_record_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_zoho_record_id
  ON public.employees (zoho_record_id)
  WHERE zoho_record_id IS NOT NULL;
