import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Check, Clock, Truck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { Sale } from '@/types';
import { getSales, updateDeliveryStatus } from '@/services/salesService';
import { formatDate } from '@/lib/firestoreUtils';
import { generateDeliveryListPDF } from '@/utils/deliveryListPDF';
import { useCompanySettings } from '@/hooks/useCompanySettings';

export default function DepositoPage() {
  const { userData } = useAuthContext();
  const { settings } = useCompanySettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const allSales = await getSales();
      
      // Filtrar vendas para retirada no depósito OU entregas pendentes
      const depositoSales = allSales.filter(
        (sale: Sale) => 
          (sale.deliveryType === 'deposito' || sale.deliveryType === 'entrega') && 
          sale.status === 'concluida'
      );
      
      setSales(depositoSales);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDeliveryList = async () => {
    if (pendingSales.length === 0) {
      toast.error('Nenhuma entrega pendente');
      return;
    }

    try {
      const deliveries = pendingSales
        .map(sale => ({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          createdAt: (sale.createdAt as any)?.toDate ? (sale.createdAt as any).toDate() : sale.createdAt instanceof Date ? sale.createdAt : new Date(),
          customerName: (sale as any).customerName || sale.clientName || 'Cliente não informado',
          customerPhone: (sale as any).customerPhone,
          deliveryAddress: sale.deliveryAddress || 'Endereço não informado',
          deliveryCity: undefined,
          deliveryState: undefined,
          products: sale.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            code: item.productCode,
          })),
          total: sale.total,
          observations: undefined,
        }))
        .sort((a, b) => {
          // Ordenar por número de venda crescente (VD000001, VD000002, etc.)
          const numA = parseInt(a.saleNumber.replace(/\D/g, ''));
          const numB = parseInt(b.saleNumber.replace(/\D/g, ''));
          return numA - numB;
        });

      await generateDeliveryListPDF(deliveries, settings, userData?.role);
      toast.success('Lista de entregas gerada com sucesso!');
    } catch (error) {
      console.error('Error generating delivery list:', error);
      toast.error('Erro ao gerar lista de entregas');
    }
  };

  const handleMarkAsDelivered = async (saleId: string) => {
    if (!userData) return;

    setProcessing(saleId);
    try {
      await updateDeliveryStatus(saleId, 'entregue', userData.uid, userData.name);
      toast.success('Produto marcado como retirado!');
      await loadSales();
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
    } finally {
      setProcessing(null);
    }
  };

  const pendingSales = sales.filter(s => s.deliveryStatus === 'pendente');
  const deliveredSales = sales.filter(s => s.deliveryStatus === 'entregue');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Depósito e Entregas</h1>
            <p className="text-white/70 mt-1">Gerencie retiradas e entregas pendentes</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateDeliveryList}
              disabled={pendingSales.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar Lista de Entregas
            </Button>
            <div className="flex gap-4 text-sm">
              <div className="bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
                <span className="text-yellow-300 font-semibold">{pendingSales.length} Pendentes</span>
              </div>
              <div className="bg-green-500/20 px-4 py-2 rounded-lg border border-green-500/30">
                <span className="text-green-300 font-semibold">{deliveredSales.length} Concluídos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vendas Pendentes */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Aguardando Retirada/Entrega</h2>
          {pendingSales.length === 0 ? (
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-8">
              <div className="text-center text-white/50">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma venda aguardando retirada</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingSales.map((sale) => (
                <Card key={sale.id} className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">#{sale.saleNumber}</h3>
                        <p className="text-sm text-white/50">
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                      <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/50">Tipo:</span>
                        <p className="text-white font-medium">
                          {sale.deliveryType === 'deposito' ? (
                            <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Retirada no Depósito</span>
                          ) : (
                            <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Entrega</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-white/50">Cliente:</span>
                        <p className="text-white font-medium">{sale.clientName}</p>
                      </div>

                      {sale.deliveryType === 'entrega' && sale.deliveryAddress && (
                        <>
                          <div>
                            <span className="text-white/50">Endereço:</span>
                            <p className="text-white text-xs">{sale.deliveryAddress}</p>
                          </div>
                          
                          {sale.deliveryDate && (
                            <div>
                              <span className="text-white/50">Data de Entrega:</span>
                              <p className="text-white text-sm font-medium">
                                {formatDate(sale.deliveryDate)}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {userData?.role !== 'deposito' && (
                        <div>
                          <span className="text-white/50">Total:</span>
                          <p className="text-white font-bold text-lg">R$ {sale.total.toFixed(2)}</p>
                        </div>
                      )}

                      <div>
                        <span className="text-white/50">Produtos:</span>
                        <div className="mt-1 space-y-1">
                          {sale.items.map((item, idx) => (
                            <p key={idx} className="text-white text-xs">
                              {item.quantity}x {item.productName}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleMarkAsDelivered(sale.id)}
                      disabled={processing === sale.id}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {processing === sale.id ? (
                        'Processando...'
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {sale.deliveryType === 'deposito' ? 'Marcar como Retirado' : 'Marcar como Entregue'}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Vendas Retiradas */}
        {deliveredSales.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Já Retirados/Entregues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveredSales.map((sale) => (
                <Card key={sale.id} className="backdrop-blur-xl bg-white/5 border-white/10 opacity-60">
                  <div className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">#{sale.saleNumber}</h3>
                        <p className="text-sm text-white/50">
                          {formatDate(sale.createdAt)}
                        </p>
                      </div>
                      <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {sale.deliveryType === 'deposito' ? 'Retirado' : 'Entregue'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-white/50">Tipo:</span>
                        <p className="text-white font-medium">
                          {sale.deliveryType === 'deposito' ? (
                            <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Retirada no Depósito</span>
                          ) : (
                            <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Entrega</span>
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-white/50">Cliente:</span>
                        <p className="text-white">{sale.clientName}</p>
                      </div>

                      {userData?.role !== 'deposito' && (
                        <div>
                          <span className="text-white/50">Total:</span>
                          <p className="text-white font-bold">R$ {sale.total.toFixed(2)}</p>
                        </div>
                      )}

                      {/* Auditoria */}
                      {sale.deliveredAt && (
                        <div className="pt-2 mt-2 border-t border-white/10">
                          <p className="text-green-300 text-xs font-semibold mb-1">
                            ✓ {sale.deliveryType === 'deposito' ? 'Retirado' : 'Entregue'} em:
                          </p>
                          <p className="text-white/70 text-xs">
                            {formatDate(sale.deliveredAt)}
                          </p>
                          {sale.deliveredByName && (
                            <p className="text-white/50 text-xs mt-1">
                              Por: {sale.deliveredByName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
