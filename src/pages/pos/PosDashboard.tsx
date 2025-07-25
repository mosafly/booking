import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, DollarSign } from 'lucide-react';
import { formatFCFA } from '@/lib/utils/currency';

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
    
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
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

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      const total = getTotalPrice();
      
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
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatFCFA(getTotalPrice())}</span>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        onClick={completeSale}
                        disabled={cart.length === 0}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Valider la vente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
