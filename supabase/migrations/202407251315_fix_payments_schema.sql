-- Fix missing sale_id column in payments table for POS Lomi integration
-- This migration adds the sale_id column to link payments to sales

-- Check if sale_id column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'sale_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN sale_id UUID REFERENCES sales(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);

-- Update existing records if needed (optional, for backward compatibility)
-- This would only be needed if you have existing payments without sale_id
-- UPDATE payments SET sale_id = reservation_id WHERE sale_id IS NULL AND reservation_id IS NOT NULL;

-- Ensure the column is properly set up for POS payments
-- The existing reservation_id can remain for backward compatibility with reservations
