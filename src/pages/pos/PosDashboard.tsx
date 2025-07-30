import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, DollarSign, CreditCard, Settings } from 'lucide-react';
import { formatFCFA } from '@/lib/utils/currency';
import ProductManagementModal from './ProductManagementModal';

interface Product {
  id: string;
  name: string;
  price_cents: number;
  category: string;
  is_active: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

export default function PosDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const navigate = useNavigate();

  // Vérifier l'authentification
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Vérifier si c'est un admin/personnel
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.role !== 'staff') {
      navigate('/');
      return;
    }
    
    loadProducts();
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price_cents * item.quantity), 0);
  };

  const completeSale = async (paymentMethod: 'cash' | 'online') => {
    if (cart.length === 0) return;

    try {
      const total = getTotalPrice();
      
      if (paymentMethod === 'online') {
        // 1. Create sale record with pending status (similar to reservation)
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_cents: total,
            payment_method: 'online',
            status: 'pending' // Status remains pending until payment confirmed
          })
          .select()
          .single();

        if (saleError) throw saleError;
        const saleId = sale.id;

        // 2. Create sale items (similar to reservation items)
        const saleItems = cart.map(item => ({
          sale_id: saleId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price_cents: item.price_cents,
          total_price_cents: item.price_cents * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // 3. Create payment record (similar to reservation payments)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non connecté');

        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .insert([
            {
              sale_id: saleId,
              user_id: user.id,
              amount: total,
              currency: "XOF",
              payment_method: "online",
              payment_provider: "lomi",
              status: "pending",
            },
          ])
          .select()
          .single();

        if (paymentError) {
          console.error("Error creating payment record:", paymentError);
        } else {
          console.log("Payment record created (pending):", paymentData);
        }

        // 4. Call Supabase Edge Function for Lomi checkout (same pattern as reservation)
        console.log("Calling Supabase function 'create-pos-payment'...");
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          "create-pos-payment",
          {
            body: {
              amount: total,
              currencyCode: "XOF",
              saleId: saleId,
              userEmail: user.email,
              userName: user.user_metadata?.full_name || user.email,
              successUrlPath: "/pos/success",
              cancelUrlPath: "/pos/cancel",
            },
          }
        );

        if (functionError) {
          console.error("Supabase function error:", functionError);
          throw new Error(`Failed to create payment session: ${functionError.message}`);
        }

        if (!functionData?.checkout_url) {
          console.error("Supabase function did not return checkout_url:", functionData);
          throw new Error("Payment session creation failed (no URL returned).");
        }

        console.log("Lomi checkout URL received:", functionData.checkout_url);

        // 5. Redirect to Lomi checkout page
        window.location.href = functionData.checkout_url;
        return;
      } else {
        // Créer la vente
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_cents: total,
            payment_method: 'cash',
            status: 'completed'
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Créer les items de vente
        const saleItems = cart.map(item => ({
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price_cents: item.price_cents,
          total_price_cents: item.price_cents * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // Vider le panier
        setCart([]);
        alert('Vente effectuée avec succès!');
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Erreur lors de la vente');
    }
  };

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Caisse Bar</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Retour au site
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produits */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produits
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProductManagement(true)}
                  className="ml-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium">{product.name}</div>
                      <span className="text-lg font-bold text-green-600">
                        {formatFCFA(product.price_cents)}
                      </span>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panier */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Panier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center">Panier vide</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <span className="text-sm text-gray-600">
                            {formatFCFA(item.price_cents)} x {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded bg-red-500 text-white"
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded bg-green-500 text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold mb-4">
                        <span>Total:</span>
                        <span>{formatFCFA(getTotalPrice())}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <Button 
                          className="w-full" 
                          onClick={() => completeSale('cash')}
                          disabled={cart.length === 0}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Payer en espèces
                        </Button>
                        
                        <Button 
                          className="w-full" 
                          onClick={() => completeSale('online')}
                          disabled={cart.length === 0}
                          variant="outline"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payer par carte (Lomi)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <ProductManagementModal
        isOpen={showProductManagement}
        onClose={() => setShowProductManagement(false)}
        onProductUpdated={loadProducts}
      />
    </div>
  );
}
