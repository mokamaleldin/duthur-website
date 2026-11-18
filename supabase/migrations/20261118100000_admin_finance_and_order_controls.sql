-- DUTHUR Admin Enhancements: Finance, Inventory, Order Deletion & Pricing Sync
-- 1. Update storefront prices to approved catalog baseline (899 / 929 / 999 TRY)
UPDATE public.products
SET base_price = 899
WHERE id = 'cb651880-c17e-4c30-98dd-f3ad4a43ddc2'
   OR slug = 'duthur-bila-aqarib-oversize-tshirt';

UPDATE public.product_variants
SET price = 899
WHERE product_id = 'cb651880-c17e-4c30-98dd-f3ad4a43ddc2';

UPDATE public.products
SET base_price = 929
WHERE id = '0109649c-ccb1-41e3-bcf4-16cb7b7295dd'
   OR slug = 'duthur-min-huna-alasl-oversize-tshirt';

UPDATE public.product_variants
SET price = 929
WHERE product_id = '0109649c-ccb1-41e3-bcf4-16cb7b7295dd';

UPDATE public.products
SET base_price = 999
WHERE id = '6e4f7f49-892b-4595-a48e-c77ba50d7c21'
   OR slug = 'duthur-walilhurriya-alhamra-bab-oversize-tshirt';

UPDATE public.product_variants
SET price = 999
WHERE product_id = '6e4f7f49-892b-4595-a48e-c77ba50d7c21';

-- 2. Ensure admins can delete orders, order_items, and contact_messages cleanly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can delete orders'
  ) THEN
    CREATE POLICY "Admins can delete orders"
    ON public.orders FOR DELETE
    TO authenticated
    USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admins can delete order_items'
  ) THEN
    CREATE POLICY "Admins can delete order_items"
    ON public.order_items FOR DELETE
    TO authenticated
    USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Admins can delete contact_messages'
  ) THEN
    CREATE POLICY "Admins can delete contact_messages"
    ON public.contact_messages FOR DELETE
    TO authenticated
    USING (public.is_admin());
  END IF;
END $$;
