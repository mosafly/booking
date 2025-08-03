import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/contexts/Supabase';
import { useAuth } from '@/lib/contexts/Auth';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface Court {
    id: string;
    name: string;
    lomi_product_id: string | null;
    price_per_hour: number;
}

interface Product {
    id: string;
    name: string;
    lomi_product_id: string | null;
    price_cents: number;
    category: string;
}

interface GymBooking {
    id: string;
    title: string;
    lomi_product_id: string | null;
    price_cents: number;
    class_type: string;
}

interface PricingSettings {
    id: string;
    use_dynamic_pricing: boolean;
}

export const PricingManagement: React.FC = () => {
    const { supabase } = useSupabase();
    const { userRole } = useAuth();
    const [courts, setCourts] = useState<Court[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [gymBookings, setGymBookings] = useState<GymBooking[]>([]);
    const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadData = React.useCallback(async () => {
        try {
            setLoading(true);

            // Load courts with product IDs
            const { data: courtsData, error: courtsError } = await supabase
                .from('courts')
                .select('id, name, lomi_product_id, price_per_hour')
                .order('name');

            if (courtsError) throw courtsError;

            // Load products with product IDs
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name, lomi_product_id, price_cents, category')
                .eq('is_active', true)
                .order('name');

            if (productsError) throw productsError;

            // Load gym bookings template (for massage, classes, etc.)
            const { data: gymData, error: gymError } = await supabase
                .from('gym_bookings')
                .select('id, title, lomi_product_id, price_cents, class_type')
                .order('title');

            if (gymError) throw gymError;

            // Load pricing settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('pricing_settings')
                .select('*')
                .limit(1)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') {
                throw settingsError;
            }

            setCourts(courtsData || []);
            setProducts(productsData || []);
            setGymBookings(gymData || []);
            setPricingSettings(settingsData);
        } catch (error) {
            console.error('Error loading pricing data:', error);
            toast.error('Failed to load pricing data');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Only allow super_admin access
    if (userRole !== 'super_admin') {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Access denied. Super admin privileges required.</p>
            </div>
        );
    }



    const updateCourtProductId = (courtId: string, productId: string) => {
        setCourts(prev => prev.map(court =>
            court.id === courtId
                ? { ...court, lomi_product_id: productId }
                : court
        ));
    };

    const updateProductProductId = (productId: string, lomiProductId: string) => {
        setProducts(prev => prev.map(product =>
            product.id === productId
                ? { ...product, lomi_product_id: lomiProductId }
                : product
        ));
    };

    const updateGymBookingProductId = (bookingId: string, lomiProductId: string) => {
        setGymBookings(prev => prev.map(booking =>
            booking.id === bookingId
                ? { ...booking, lomi_product_id: lomiProductId }
                : booking
        ));
    };

    const toggleDynamicPricing = () => {
        setPricingSettings(prev => prev ? {
            ...prev,
            use_dynamic_pricing: !prev.use_dynamic_pricing
        } : null);
    };

    const saveSettings = async () => {
        try {
            setSaving(true);

            // Save pricing settings
            if (pricingSettings) {
                const { error: settingsError } = await supabase
                    .from('pricing_settings')
                    .upsert({
                        id: pricingSettings.id,
                        use_dynamic_pricing: pricingSettings.use_dynamic_pricing
                    });

                if (settingsError) throw settingsError;
            }

            // Save court product IDs
            for (const court of courts) {
                const { error: courtError } = await supabase
                    .from('courts')
                    .update({ lomi_product_id: court.lomi_product_id })
                    .eq('id', court.id);

                if (courtError) throw courtError;
            }

            // Save product product IDs
            for (const product of products) {
                const { error: productError } = await supabase
                    .from('products')
                    .update({ lomi_product_id: product.lomi_product_id })
                    .eq('id', product.id);

                if (productError) throw productError;
            }

            // Save gym booking product IDs
            for (const booking of gymBookings) {
                const { error: bookingError } = await supabase
                    .from('gym_bookings')
                    .update({ lomi_product_id: booking.lomi_product_id })
                    .eq('id', booking.id);

                if (bookingError) throw bookingError;
            }

            toast.success('Pricing settings saved successfully');
        } catch (error) {
            console.error('Error saving pricing settings:', error);
            toast.error('Failed to save pricing settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
                    <p className="text-gray-600">Configure Lomi product IDs and dynamic pricing</p>
                </div>
                <Button onClick={saveSettings} disabled={saving} className="gap-2">
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            {/* Dynamic Pricing Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings size={20} />
                        Pricing Mode
                    </CardTitle>
                    <CardDescription>
                        Choose between product-based pricing (tracked by Lomi) or dynamic pricing (manual prices)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-3">
                        <Switch
                            checked={pricingSettings?.use_dynamic_pricing || false}
                            onCheckedChange={toggleDynamicPricing}
                        />
                        <div>
                            <Label className="text-base font-medium">
                                {pricingSettings?.use_dynamic_pricing ? 'Dynamic Pricing' : 'Product-Based Pricing'}
                            </Label>
                            <p className="text-sm text-gray-600">
                                {pricingSettings?.use_dynamic_pricing
                                    ? 'Prices are manually set, no Lomi product tracking'
                                    : 'Prices come from Lomi products, better tracking and analytics'
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lomi Product ID Configuration */}
            {!pricingSettings?.use_dynamic_pricing && (
                <div className="space-y-6">
                    {/* Courts */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Court Lomi Product IDs</CardTitle>
                            <CardDescription>
                                Configure which Lomi product ID each court should use for payments
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {courts.map((court) => (
                                    <div key={court.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <Label className="font-medium">{court.name}</Label>
                                            <p className="text-sm text-gray-600">
                                                Current price: {court.price_per_hour} XOF/hour
                                            </p>
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor={`court-${court.id}`} className="text-sm">
                                                Lomi Product ID
                                            </Label>
                                            <Input
                                                id={`court-${court.id}`}
                                                value={court.lomi_product_id || ''}
                                                onChange={(e) => updateCourtProductId(court.id, e.target.value)}
                                                placeholder="e.g., product-1h-padel"
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Products (POS) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Product Lomi Product IDs</CardTitle>
                            <CardDescription>
                                Configure Lomi product IDs for POS system items (drinks, snacks, equipment)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {products.map((product) => (
                                    <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <Label className="font-medium">{product.name}</Label>
                                            <p className="text-sm text-gray-600">
                                                Category: {product.category} | Price: {(product.price_cents / 100).toFixed(0)} XOF
                                            </p>
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor={`product-${product.id}`} className="text-sm">
                                                Lomi Product ID
                                            </Label>
                                            <Input
                                                id={`product-${product.id}`}
                                                value={product.lomi_product_id || ''}
                                                onChange={(e) => updateProductProductId(product.id, e.target.value)}
                                                placeholder="e.g., product-drink-cola"
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gym Bookings (Classes, Massage, etc.) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gym Service Lomi Product IDs</CardTitle>
                            <CardDescription>
                                Configure Lomi product IDs for gym classes, massage, and other services
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {gymBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <Label className="font-medium">{booking.title}</Label>
                                            <p className="text-sm text-gray-600">
                                                Type: {booking.class_type} | Price: {(booking.price_cents / 100).toFixed(0)} XOF
                                            </p>
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor={`booking-${booking.id}`} className="text-sm">
                                                Lomi Product ID
                                            </Label>
                                            <Input
                                                id={`booking-${booking.id}`}
                                                value={booking.lomi_product_id || ''}
                                                onChange={(e) => updateGymBookingProductId(booking.id, e.target.value)}
                                                placeholder="e.g., product-massage-60min"
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Product-Based Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p><strong>How it works:</strong></p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Each court has a Lomi product ID</li>
                            <li>Lomi handles pricing and currency conversion</li>
                            <li>Better tracking and analytics in Lomi dashboard</li>
                            <li>Supports quantity-based pricing (2h = 2x 1h product)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Dynamic Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p><strong>How it works:</strong></p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Prices are set manually in the app</li>
                            <li>More flexible for special offers or events</li>
                            <li>No product tracking in Lomi</li>
                            <li>Suitable for custom pricing strategies</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};