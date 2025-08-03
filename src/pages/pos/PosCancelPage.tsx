import { useNavigate, useSearchParams } from 'react-router-dom'
import { XCircle, ShoppingCart } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function PosCancelPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const saleId = searchParams.get('sale_id')

  const handleReturnToPos = async () => {
    if (saleId) {
      try {
        // Update sale status to cancelled
        await supabase
          .from('sales')
          .update({ status: 'cancelled' })
          .eq('id', saleId)

        // Update payment status to cancelled
        await supabase
          .from('payments')
          .update({ status: 'cancelled' })
          .eq('sale_id', saleId)
      } catch (error) {
        console.error('Error cancelling sale:', error)
      }
    }
    navigate('/pos')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement Annulé
            </h1>
            <p className="text-gray-600 mb-6">
              Le paiement a été annulé. Votre vente est en attente.
            </p>
          </div>

          {saleId && (
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Numéro de vente:</span>
                <span className="font-mono text-sm">{saleId.slice(0, 8)}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  Vous pouvez retourner au POS pour compléter cette vente ou en
                  créer une nouvelle.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleReturnToPos}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 inline mr-2" />
              Retour au POS
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
  )
}
