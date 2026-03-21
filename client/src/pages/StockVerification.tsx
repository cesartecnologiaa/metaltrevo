import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, RefreshCw, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Product {
  id: string;
  name: string;
  code: string;
  currentStock: number;
  minStock: number;
  categoryName?: string;
}

export default function StockVerification() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      // Ordenar: produtos com estoque 0 primeiro, depois por nome
      productsData.sort((a, b) => {
        if (a.currentStock === 0 && b.currentStock !== 0) return -1;
        if (a.currentStock !== 0 && b.currentStock === 0) return 1;
        return a.name.localeCompare(b.name);
      });

      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.currentStock.toString());
    setEditDialogOpen(true);
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) return;

    const stockValue = parseFloat(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('Valor de estoque inválido');
      return;
    }

    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        currentStock: stockValue
      });

      toast.success('Estoque atualizado com sucesso!');
      setEditDialogOpen(false);
      await loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      toast.error('Erro ao atualizar estoque');
    }
  };

  const productsWithIssues = products.filter(p => p.currentStock === 0 || p.currentStock < p.minStock);
  const productsOk = products.filter(p => p.currentStock > 0 && p.currentStock >= p.minStock);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Verificação de Estoque</h1>
            <p className="text-white/70 mt-2">
              Identifique e corrija inconsistências no estoque
            </p>
          </div>
          <Button
            onClick={loadProducts}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {loading && (
          <div className="text-center text-white/70 py-8">
            Carregando produtos...
          </div>
        )}

        {/* Resumo */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Total de Produtos</p>
                  <p className="text-2xl font-bold text-white">{products.length}</p>
                </div>
              </div>
            </Card>

            <Card className="backdrop-blur-xl bg-red-500/10 border-red-500/30 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Com Problemas</p>
                  <p className="text-2xl font-bold text-white">{productsWithIssues.length}</p>
                </div>
              </div>
            </Card>

            <Card className="backdrop-blur-xl bg-green-500/10 border-green-500/30 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">OK</p>
                  <p className="text-2xl font-bold text-white">{productsOk.length}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Produtos com Problemas */}
        {!loading && productsWithIssues.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Produtos com Problemas ({productsWithIssues.length})
            </h2>
            <div className="space-y-3">
              {productsWithIssues.map((product) => {
                const isZero = product.currentStock === 0;
                const isBelowMin = product.currentStock < product.minStock;

                return (
                  <Card
                    key={product.id}
                    className={`backdrop-blur-xl border p-4 ${
                      isZero
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-orange-500/20 border-orange-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isZero ? 'bg-red-500/30' : 'bg-orange-500/30'
                            }`}
                          >
                            <AlertTriangle
                              className={`w-5 h-5 ${
                                isZero ? 'text-red-400' : 'text-orange-400'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-white/50 text-sm">Código: {product.code}</p>
                            {product.categoryName && (
                              <p className="text-white/50 text-sm">
                                Categoria: {product.categoryName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p
                            className={`text-2xl font-bold ${
                              isZero ? 'text-red-400' : 'text-orange-400'
                            }`}
                          >
                            {product.currentStock}
                          </p>
                          <p className="text-white/50 text-sm">
                            Mín: {product.minStock}
                          </p>
                          {isZero && (
                            <p className="text-red-400 text-xs font-semibold mt-1">
                              ⚠️ ESTOQUE ZERADO
                            </p>
                          )}
                          {!isZero && isBelowMin && (
                            <p className="text-orange-400 text-xs font-semibold mt-1">
                              ⚠️ ABAIXO DO MÍNIMO
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleEditStock(product)}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Corrigir
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Produtos OK */}
        {!loading && productsOk.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Produtos OK ({productsOk.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsOk.map((product) => (
                <Card
                  key={product.id}
                  className="backdrop-blur-xl bg-white/5 border-white/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-white/50 text-xs">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-lg">
                        {product.currentStock}
                      </p>
                      <p className="text-white/50 text-xs">Mín: {product.minStock}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Dialog de Edição */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Corrigir Estoque
              </DialogTitle>
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-4">
                <div>
                  <p className="text-white font-medium text-lg">
                    {selectedProduct.name}
                  </p>
                  <p className="text-white/50 text-sm">
                    Código: {selectedProduct.code}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/70 text-sm">Estoque Atual</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedProduct.currentStock}
                  </p>
                </div>

                <div>
                  <Label className="text-white">Novo Estoque</Label>
                  <Input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Digite o estoque correto"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveStock}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Salvar
                  </Button>
                  <Button
                    onClick={() => setEditDialogOpen(false)}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
