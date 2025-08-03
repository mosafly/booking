import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


type SaleItem = {
  id: string;
  name: string;
  quantity: number;
  price_cents: number;
  total_price_cents: number;
};

type Sale = {
  id: string;
  total_cents: number;
  created_at: string;
  sale_items: SaleItem[];
};

export default function PosSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sale, setSale] = React.useState<Sale | null>(null);
  const [loading, setLoading] = React.useState(true);

  const saleId = searchParams.get('sale_id');

  useEffect(() => {
    if (!saleId) {
      navigate('/pos');
      return;
    }

    const fetchSaleDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            *,
            sale_items(
              *,
              products(name)
            )
          `)
          .eq('id', saleId)
          .single();

        if (error) throw error;

        // Transform the data to match our types
        const saleData: Sale = {
          id: data.id,
          total_cents: data.total_cents,
          created_at: data.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sale_items: data.sale_items.map((item: any) => ({
            id: item.id,
            name: item.products.name,
            quantity: item.quantity,
            price_cents: item.unit_price_cents,
            total_price_cents: item.total_price_cents
          }))
        };

        setSale(saleData);
      } catch (error) {
        console.error('Error fetching sale details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDetails();
  }, [saleId, navigate]);

  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Vente introuvable</p>
          <button
            onClick={() => navigate('/pos')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retour au POS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement Réussi
            </h1>
            <p className="text-gray-600 mb-6">
              Votre vente a été payée avec succès
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Numéro de vente:</span>
              <span className="font-mono text-sm">{sale.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600">Date:</span>
              <span>{new Date(sale.created_at).toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg">{formatFCFA(sale.total_cents)}</span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900">Détails de la vente</h3>
            {sale.sale_items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.quantity} × {formatFCFA(item.price_cents)}</p>
                </div>
                <p className="font-medium">{formatFCFA(item.total_price_cents)}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/pos')}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 inline mr-2" />
              Nouvelle Vente
            </button>
            <button
              onClick={() => navigate('/home')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
