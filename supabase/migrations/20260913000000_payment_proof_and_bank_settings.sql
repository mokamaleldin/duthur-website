-- 1. Add payment proof columns to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_proof_path TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

-- 2. Add structured bank columns to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Kuveyt Türk',
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT DEFAULT 'Mohamed Kamaleldin Mohamed Attia Eliwa',
ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT 'TR 3200 0100 9011 0528 0760 5005';

-- Update existing store_settings row with defaults if null
UPDATE public.store_settings
SET
  bank_name = COALESCE(bank_name, 'Kuveyt Türk'),
  bank_account_holder = COALESCE(bank_account_holder, 'Mohamed Kamaleldin Mohamed Attia Eliwa'),
  bank_iban = COALESCE(bank_iban, 'TR 3200 0100 9011 0528 0760 5005')
WHERE id IS NOT NULL;

-- 3. Create private storage bucket for payment proofs if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4. RLS policies for payment-proofs bucket
CREATE POLICY "Admins can view and manage payment proofs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND public.is_admin()
);

-- Allow customers to upload payment proofs to storage
CREATE POLICY "Public can upload payment proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- 5. Safe RPC to attach payment proof to an order
CREATE OR REPLACE FUNCTION public.attach_order_payment_proof(
  p_order_id UUID,
  p_proof_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET
    payment_proof_path = p_proof_path,
    payment_proof_uploaded_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'path', p_proof_path);
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_order_payment_proof(UUID, TEXT) TO public, anon, authenticated;
