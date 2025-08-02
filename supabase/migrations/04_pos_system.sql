-- ####################################################################
-- ### UP MIGRATION (CREATION)
-- ####################################################################

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    payment_method VARCHAR(50) DEFAULT 'cash',
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at_trigger
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at_trigger
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically add product to inventory when created
CREATE OR REPLACE FUNCTION public.add_product_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (product_id, quantity, min_stock, max_stock)
    VALUES (NEW.id, 0, 0, 100);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically add product to inventory
CREATE TRIGGER add_product_to_inventory_trigger
    AFTER INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.add_product_to_inventory();

-- Create function to automatically update inventory after sale
CREATE OR REPLACE FUNCTION public.update_inventory_after_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.inventory 
    SET quantity = quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update inventory after sale
CREATE TRIGGER update_inventory_after_sale_trigger
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_inventory_after_sale();

-- ####################################################################
-- ### DOWN MIGRATION (ROLLBACK)
-- ####################################################################

-- Drop triggers and functions in correct order
DROP TRIGGER IF EXISTS update_inventory_after_sale_trigger ON public.sale_items;
DROP FUNCTION IF EXISTS public.update_inventory_after_sale();

DROP TRIGGER IF EXISTS add_product_to_inventory_trigger ON public.products;
DROP FUNCTION IF EXISTS public.add_product_to_inventory();

DROP TRIGGER IF EXISTS update_inventory_updated_at_trigger ON public.inventory;
DROP TRIGGER IF EXISTS update_products_updated_at_trigger ON public.products;
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop tables in reverse order
DROP TABLE IF EXISTS public.sale_items;
DROP TABLE IF EXISTS public.sales;
DROP TABLE IF EXISTS public.inventory;
DROP TABLE IF EXISTS public.products;
