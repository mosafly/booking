import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/contexts/Supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatFCFA } from '@/lib/utils/currency';

interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  min_stock: number;
  max_stock: number;
}

export default function ProductsManagement() {
  const { supabase } = useSupabase();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_cents: 0,
    category: 'boissons',
    is_active: true,
    initial_stock: 0,
    min_stock: 5,
    max_stock: 100
  });

  useEffect(() => {
    loadProducts();
    loadInventory();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');
      
      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const getStockForProduct = (productId: string) => {
    const item = inventory.find(inv => inv.product_id === productId);
    return item?.quantity || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price_cents: formData.price_cents,
            category: formData.category,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produit mis à jour');
      } else {
        // Create new product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            description: formData.description,
            price_cents: formData.price_cents,
            category: formData.category,
            is_active: formData.is_active
          })
          .select()
          .single();

        if (productError) throw productError;

        // Create inventory entry
        await supabase.from('inventory').insert({
          product_id: product.id,
          quantity: formData.initial_stock,
          min_stock: formData.min_stock,
          max_stock: formData.max_stock
        });

        toast.success('Produit créé avec succès');
      }

      resetForm();
      loadProducts();
      loadInventory();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_cents: 0,
      category: 'boissons',
      is_active: true,
      initial_stock: 0,
      min_stock: 5,
      max_stock: 100
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price_cents: product.price_cents,
      category: product.category,
      is_active: product.is_active,
      initial_stock: getStockForProduct(product.id),
      min_stock: 5,
      max_stock: 100
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await supabase.from('products').update({ is_active: false }).eq('id', productId);
      toast.success('Produit désactivé');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const categories = [
    { value: 'boissons', label: 'Boissons' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'sandwichs', label: 'Sandwichs' },
    { value: 'desserts', label: 'Desserts' },
    { value: 'autres', label: 'Autres' }
  ];

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Produits</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Produit
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Modifier le produit' : 'Créer un nouveau produit'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom du produit</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Prix (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.price_cents}
                    onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                {!editingProduct && (
                  <div>
                    <Label>Stock initial</Label>
                    <Input
                      type="number"
                      value={formData.initial_stock}
                      onChange={(e) => setFormData({ ...formData, initial_stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Produit actif</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingProduct ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.category}</div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Prix:</span>
                  <span className="font-bold">{formatFCFA(product.price_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span className={getStockForProduct(product.id) < 5 ? 'text-red-600' : ''}>
                    {getStockForProduct(product.id)} unités
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Statut:</span>
                  <span className={product.is_active ? 'text-green-600' : 'text-red-600'}>
                    {product.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
