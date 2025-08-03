import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatFCFA } from '@/lib/utils/currency'

interface Product {
  id: string
  name: string
  description: string
  price_cents: number
  category: string
  is_active: boolean
  stock_quantity: number
  min_stock: number
  max_stock: number
}

interface ProductManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onProductUpdated: () => void
}

export default function ProductManagementModal({
  isOpen,
  onClose,
  onProductUpdated,
}: ProductManagementModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [updatingStock, setUpdatingStock] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_cents: 0,
    category: 'boissons',
    stock_quantity: 0,
    min_stock: 5,
    max_stock: 100,
  })

  useEffect(() => {
    if (isOpen) {
      loadProducts()
    }
  }, [isOpen])

  const loadProducts = async () => {
    try {
      setLoading(true)

      // Charger les produits avec leur stock
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (productsError) throw productsError

      // Charger l'inventaire
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')

      if (inventoryError) throw inventoryError

      // Fusionner les données
      const productsWithStock = productsData.map((product) => {
        const inventory = inventoryData.find(
          (inv) => inv.product_id === product.id,
        )
        return {
          ...product,
          stock_quantity: inventory?.quantity || 0,
          min_stock: inventory?.min_stock || 5,
          max_stock: inventory?.max_stock || 100,
        }
      })

      setProducts(productsWithStock)
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Ajouter le produit
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            price_cents: formData.price_cents,
            category: formData.category,
            is_active: true,
          },
        ])
        .select()
        .single()

      if (productError) throw productError

      // Ajouter l'inventaire
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([
          {
            product_id: productData.id,
            quantity: formData.stock_quantity,
            min_stock: formData.min_stock,
            max_stock: formData.max_stock,
          },
        ])

      if (inventoryError) throw inventoryError

      toast.success('Produit ajouté avec succès')
      setShowAddForm(false)
      setFormData({
        name: '',
        description: '',
        price_cents: 0,
        category: 'boissons',
        stock_quantity: 0,
        min_stock: 5,
        max_stock: 100,
      })
      loadProducts()
      onProductUpdated()
    } catch (error) {
      console.error("Erreur lors de l'ajout du produit:", error)
      toast.error("Erreur lors de l'ajout du produit")
    }
  }

  const handleUpdateProduct = async (product: Product) => {
    try {
      // Mettre à jour le produit
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: product.name,
          description: product.description,
          price_cents: product.price_cents,
          category: product.category,
        })
        .eq('id', product.id)

      if (productError) throw productError

      // Mettre à jour l'inventaire
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          quantity: product.stock_quantity,
          min_stock: product.min_stock,
          max_stock: product.max_stock,
        })
        .eq('product_id', product.id)

      if (inventoryError) throw inventoryError

      toast.success('Produit mis à jour avec succès')
      setEditingProduct(null)
      loadProducts()
      onProductUpdated()
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error)
      toast.error('Erreur lors de la mise à jour du produit')
    }
  }

  const handleStockUpdate = async (productId: string, quantity: number) => {
    try {
      setUpdatingStock(productId)

      const { error } = await supabase
        .from('inventory')
        .update({ quantity })
        .eq('product_id', productId)

      if (error) throw error

      // Mettre à jour l'état local immédiatement pour une réponse rapide
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, stock_quantity: quantity } : p,
        ),
      )

      toast.success(`Stock mis à jour: ${quantity} unités`)
      onProductUpdated()
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock:', error)
      toast.error('Erreur lors de la mise à jour du stock')
      // Recharger les données en cas d'erreur
      loadProducts()
    } finally {
      setUpdatingStock(null)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return

    try {
      // Supprimer l'inventaire d'abord
      await supabase.from('inventory').delete().eq('product_id', productId)

      // Supprimer le produit
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      toast.success('Produit supprimé avec succès')
      loadProducts()
      onProductUpdated()
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error)
      toast.error('Erreur lors de la suppression du produit')
    }
  }

  const adjustStock = (productId: string, adjustment: number) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const newQuantity = Math.max(0, product.stock_quantity + adjustment)
      handleStockUpdate(productId, newQuantity)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Gestion des Produits et Stock</h2>
          <Button variant="ghost" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="mb-4 flex gap-2">
          <Button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Ajouter un nouveau produit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du produit</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Prix (FCFA)</Label>
                    <Input
                      type="number"
                      value={formData.price_cents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_cents: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Catégorie</Label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full border rounded-md p-2"
                    >
                      <option value="boissons">Boissons</option>
                      <option value="snacks">Snacks</option>
                      <option value="accessoires">Accessoires</option>
                      <option value="autres">Autres</option>
                    </select>
                  </div>
                  <div>
                    <Label>Stock initial</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border rounded-md p-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Ajouter</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  {editingProduct?.id === product.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          value={editingProduct.name}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              name: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          value={editingProduct.price_cents}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              price_cents: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <select
                          value={editingProduct.category}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              category: e.target.value,
                            })
                          }
                          className="border rounded-md p-2"
                        >
                          <option value="boissons">Boissons</option>
                          <option value="snacks">Snacks</option>
                          <option value="accessoires">Accessoires</option>
                          <option value="autres">Autres</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateProduct(editingProduct)}
                        >
                          Sauvegarder
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(null)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          {formatFCFA(product.price_cents)} • Stock:{' '}
                          {product.stock_quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustStock(product.id, -1)}
                            disabled={updatingStock === product.id}
                          >
                            <TrendingDown className="h-3 w-3" />
                          </Button>
                          <span
                            className={`w-12 text-center text-sm font-medium ${
                              product.stock_quantity <= product.min_stock
                                ? 'text-red-600'
                                : product.stock_quantity >= product.max_stock
                                  ? 'text-green-600'
                                  : ''
                            }`}
                          >
                            {updatingStock === product.id
                              ? '...'
                              : product.stock_quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustStock(product.id, 1)}
                            disabled={updatingStock === product.id}
                          >
                            <TrendingUp className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
