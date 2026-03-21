import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { getActiveProducts } from '@/services/productService';
import { formatCurrency } from '@/lib/formatters';

interface QuickSearchProps {
  open: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
}

export default function QuickSearch({ open, onClose, onSelectProduct }: QuickSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadProducts();
      // Focar no input quando abrir
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm('');
    }
  }, [open]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getActiveProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.includes(searchTerm) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 10); // Limitar a 10 resultados

  const handleSelectProduct = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl backdrop-blur-2xl bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6" />
            Busca Rápida de Produtos
          </DialogTitle>
          <p className="text-white/70 text-sm">Pressione ESC para fechar</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Digite o nome, código ou descrição do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-lg"
            />
          </div>

          {/* Resultados */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-white/70">
                Carregando produtos...
              </div>
            ) : searchTerm === '' ? (
              <div className="text-center py-8 text-white/50">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Digite para buscar produtos</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10 hover:border-white/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        {product.currentStock <= product.minStock && (
                          <span className="flex items-center gap-1 text-xs text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            Estoque baixo
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-sm">Código: {product.code}</p>
                      {product.description && (
                        <p className="text-white/70 text-sm mt-1">{product.description}</p>
                      )}
                      {product.categoryName && (
                        <span className="inline-block mt-2 px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs">
                          {product.categoryName}
                        </span>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-green-400 font-bold text-xl">
                        R$ {formatCurrency(product.price)}
                      </p>
                      <p className={`text-sm font-semibold mt-1 ${
                        product.currentStock <= 0 
                          ? 'text-red-400' 
                          : product.currentStock <= product.minStock 
                          ? 'text-orange-400' 
                          : 'text-white/70'
                      }`}>
                        Estoque: {product.currentStock}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dica de Atalho */}
          <div className="text-center text-white/50 text-xs pt-2 border-t border-white/10">
            Pressione <kbd className="px-2 py-1 bg-white/10 rounded">F2</kbd> para abrir esta busca a qualquer momento
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
