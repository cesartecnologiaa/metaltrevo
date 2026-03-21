import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package } from 'lucide-react';
import { Link } from 'wouter';

interface LowStockProduct {
  id: string;
  name: string;
  code: string;
  currentStock: number;
  minStock: number;
  categoryName?: string;
}

interface LowStockAlertProps {
  products: LowStockProduct[];
  className?: string;
}

export default function LowStockAlert({ products, className = '' }: LowStockAlertProps) {
  const liquidGlassCard = "backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl";

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className={`${liquidGlassCard} ${className}`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Alerta de Estoque Baixo</h2>
            <p className="text-white/50 text-sm">{products.length} produto(s) precisam reposição</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {products.map((product) => {
            const stockPercentage = (product.currentStock / product.minStock) * 100;
            const isCritical = stockPercentage < 50;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-lg transition-all ${
                  isCritical 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-orange-500/20 border border-orange-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCritical ? 'bg-red-500/30' : 'bg-orange-500/30'
                    }`}>
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-white/50 text-xs">Código: {product.code}</p>
                      {product.categoryName && (
                        <p className="text-white/50 text-xs">Categoria: {product.categoryName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>
                      {product.currentStock}
                    </p>
                    <p className="text-white/50 text-xs">Mín: {product.minStock}</p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isCritical 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : 'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}
                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                  />
                </div>

                {isCritical && (
                  <p className="text-red-400 text-xs mt-2 font-semibold">
                    ⚠️ Estoque crítico! Repor urgentemente
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Link href="/produtos">
          <Button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            Ver Todos os Produtos
          </Button>
        </Link>
      </div>
    </Card>
  );
}
