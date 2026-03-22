import { useState, useEffect, useRef } from 'react';
import { Search, Eye, XCircle, Printer, Calendar, DollarSign, User, Filter, FileText, FileSpreadsheet, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { exportSalesToPDF, exportSalesToExcel } from '@/lib/exportUtils';
import { Sale, SaleStatus, PaymentMethod } from '@/types';
import { getSales, cancelSale } from '@/services/salesService';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCpfCnpj } from '@/lib/validators';
import { safeToDate, formatDateTime } from '@/lib/firestoreUtils';
import { formatCurrency } from '@/lib/formatters';
import SaleReceipt from '@/components/SaleReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

export default function Sales() {
  const { userData } = useAuthContext();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [deliveryStatusDialogOpen, setDeliveryStatusDialogOpen] = useState(false);
  const [updatingDeliveryStatus, setUpdatingDeliveryStatus] = useState(false);
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);

  const { printRef, printReceipt } = usePrintReceipt();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const salesData = await getSales();
      setSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsDialogOpen(true);
  };

  const handleOpenCancelDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelSale = async () => {
    if (!selectedSale || !userData) return;

    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    setCancelling(true);
    try {
      await cancelSale(
        selectedSale.id,
        userData.uid,
        userData.name || 'Usuário',
        cancelReason.trim()
      );

      toast.success('Venda cancelada com sucesso!');
      setCancelDialogOpen(false);
      loadSales();
    } catch (error) {
      console.error('Error cancelling sale:', error);
      toast.error('Erro ao cancelar venda');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrintReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setReprintDialogOpen(true);
  };

  const handleUpdateDeliveryStatus = async (status: 'pendente' | 'entregue') => {
    if (!selectedSale) return;

    setUpdatingDeliveryStatus(true);
    try {
      const { updateDeliveryStatus } = await import('@/services/salesService');
      await updateDeliveryStatus(selectedSale.id, status, userData?.uid, userData?.name);
      toast.success(`Status de entrega atualizado para: ${status === 'entregue' ? 'Entregue' : 'Pendente'}`);
      setDeliveryStatusDialogOpen(false);
      await loadSales();
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      toast.error(error?.message || 'Erro ao atualizar status de entrega');
    } finally {
      setUpdatingDeliveryStatus(false);
    }
  };

  const handleExportPDF = () => {
    try {
      exportSalesToPDF(filteredSales, filterDateStart, filterDateEnd);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportExcel = () => {
    try {
      exportSalesToExcel(filteredSales, filterDateStart, filterDateEnd);
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  const getStatusColor = (status: SaleStatus) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelada':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const getStatusLabel = (status: SaleStatus) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'dinheiro':
        return 'Dinheiro';
      case 'cartao_credito':
        return 'Cartão de Crédito';
      case 'cartao_debito':
        return 'Cartão de Débito';
      case 'pix':
        return 'PIX';
      case 'boleto':
        return 'Boleto';
      default:
        return method;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '';
    }
  };

  // Filtros
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.clientName && sale.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || sale.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || sale.paymentMethod === filterPayment;

    let matchesDate = true;
    if (filterDateStart || filterDateEnd) {
      try {
        const saleDate = safeToDate(sale.createdAt);
        const startDate = filterDateStart ? new Date(filterDateStart) : null;
        const endDate = filterDateEnd ? new Date(filterDateEnd) : null;

        if (startDate && saleDate < startDate) matchesDate = false;
        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
          if (saleDate > endDate) matchesDate = false;
        }
      } catch (error) {
        // Ignore date parse errors
      }
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  // Estatísticas
  const stats = {
    total: filteredSales.filter(s => s.status !== 'cancelada').length, // Excluir canceladas do total
    completed: filteredSales.filter(s => s.status === 'concluida').length,
    cancelled: filteredSales.filter(s => s.status === 'cancelada').length,
    totalRevenue: filteredSales
      .filter(s => s.status === 'concluida')
      .reduce((sum, s) => sum + s.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Vendas</h1>
          <p className="text-white/70 mt-1">Visualize e gerencie todas as vendas</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <FileText className="w-5 h-5 mr-2" />
            Exportar PDF
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total de Vendas</p>
              <p className="text-white font-bold text-xl">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Concluídas</p>
              <p className="text-white font-bold text-xl">{stats.completed}</p>
            </div>
          </div>
        </Card>

        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500/20">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Canceladas</p>
              <p className="text-white font-bold text-xl">{stats.cancelled}</p>
            </div>
          </div>
        </Card>

        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Faturamento</p>
              <p className="text-green-400 font-bold text-xl">
                R$ {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label className="text-white mb-2 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <Input
                type="text"
                placeholder="Número, vendedor ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          <div>
            <Label className="text-white mb-2 block">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Pagamento</Label>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao_debito">Débito</SelectItem>
                <SelectItem value="cartao_credito">Crédito</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Período</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
              <Input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de Vendas */}
      {loading ? (
        <div className="text-center py-12 text-white/70">
          Carregando vendas...
        </div>
      ) : filteredSales.length === 0 ? (
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 text-lg">Nenhuma venda encontrada</p>
          <p className="text-white/50 text-sm mt-2">Ajuste os filtros ou realize uma nova venda</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card
              key={sale.id}
              className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">#{sale.saleNumber}</h3>
                    <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${getStatusColor(sale.status)}`}>
                      {getStatusLabel(sale.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-white/50">Data/Hora</p>
                      <p className="text-white font-medium">{formatDate(sale.createdAt)}</p>
                    </div>

                    <div>
                      <p className="text-white/50">Vendedor</p>
                      <p className="text-white font-medium">{sale.sellerName}</p>
                    </div>

                    <div>
                      <p className="text-white/50">Pagamento</p>
                      <p className="text-white font-medium">{getPaymentMethodLabel(sale.paymentMethod)}</p>
                    </div>

                    <div>
                      <p className="text-white/50">Total</p>
                      <p className="text-green-400 font-bold text-lg">R$ {formatCurrency(sale.total)}</p>
                    </div>
                  </div>

                  {sale.clientName && (
                    <div className="mt-2 text-sm">
                      <p className="text-white/50">Cliente: <span className="text-white">{sale.clientName}</span></p>
                    </div>
                  )}

                  {sale.deliveryType === 'entrega' && (
                    <div className="mt-2 text-sm space-y-1">
                      <p className="text-white/50">Entrega: 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          sale.deliveryStatus === 'entregue' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {sale.deliveryStatus === 'entregue' ? 'Entregue' : 'Pendente'}
                        </span>
                      </p>
                      {(sale as any).deliveryDate && (
                        <p className="text-white/50 text-xs">
                          Agendado: {formatDate((sale as any).deliveryDate)}
                        </p>
                      )}
                      {sale.deliveryStatus === 'entregue' && (sale as any).deliveredByName && (
                        <p className="text-white/50 text-xs">
                          Entregue por: {(sale as any).deliveredByName} em {formatDateTime((sale as any).deliveredAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {sale.deliveryType === 'deposito' && (
                    <div className="mt-2 text-sm space-y-1">
                      <p className="text-white/50">Retirada no Depósito: 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          sale.deliveryStatus === 'entregue' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {sale.deliveryStatus === 'entregue' ? 'Retirado' : 'Pendente'}
                        </span>
                      </p>
                      {sale.deliveryStatus === 'entregue' && (sale as any).deliveredByName && (
                        <p className="text-white/50 text-xs">
                          Retirado por: {(sale as any).deliveredByName} em {formatDateTime((sale as any).deliveredAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {sale.cancellation && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-sm font-semibold mb-1">Cancelamento</p>
                      <p className="text-white/70 text-xs">
                        <strong>Motivo:</strong> {sale.cancellation.reason}
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        Cancelado por {sale.cancellation.cancelledByName} em {formatDate(sale.cancellation.cancelledAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleViewDetails(sale)}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handlePrintReceipt(sale)}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  {((sale.deliveryType === 'entrega' || sale.deliveryType === 'deposito') && sale.status === 'concluida' && userData?.role === 'admin') && (
                    <Button
                      onClick={() => {
                        setSelectedSale(sale);
                        setDeliveryStatusDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                      title="Alterar status de entrega/retirada"
                    >
                      <Truck className="w-4 h-4" />
                    </Button>
                  )}
                  {sale.status === 'concluida' && (
                    <Button
                      onClick={() => handleOpenCancelDialog(sale)}
                      variant="outline"
                      size="sm"
                      className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes */}
      {selectedSale && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Detalhes da Venda #{selectedSale.saleNumber}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Visualize os dados completos da venda selecionada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Informações Gerais */}
              <div>
                <h3 className="text-white font-semibold mb-3">Informações Gerais</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border ${getStatusColor(selectedSale.status)}`}>
                      {getStatusLabel(selectedSale.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white/50">Data/Hora</p>
                    <p className="text-white">{formatDate(selectedSale.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Vendedor</p>
                    <p className="text-white">{selectedSale.sellerName}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Pagamento</p>
                    <p className="text-white">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
                  </div>
                  {selectedSale.clientName && (
                    <div className="col-span-2">
                      <p className="text-white/50">Cliente</p>
                      <p className="text-white">{selectedSale.clientName}</p>
                      {selectedSale.clientDocument && (
                        <p className="text-white/70 text-xs">{formatCpfCnpj(selectedSale.clientDocument)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div>
                <h3 className="text-white font-semibold mb-3">Itens da Venda</h3>
                <div className="space-y-2">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.productName}</p>
                        <p className="text-white/50 text-xs">Cód: {item.productCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-sm">
                          {item.quantity}x R$ {formatCurrency(item.unitPrice)}
                        </p>
                        <p className="text-white font-bold">R$ {formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="border-t border-white/20 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>R$ {formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-red-300">
                      <span>Desconto</span>
                      <span>- R$ {formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold text-xl">
                    <span>Total</span>
                    <span className="text-green-400">R$ {formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

              {selectedSale.notes && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Observações</h3>
                  <p className="text-white/70 text-sm">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Cancelamento */}
      {selectedSale && (
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Cancelar Venda #{selectedSale.saleNumber}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Confirme o cancelamento da venda e informe os dados necessários.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-300 text-sm">
                  ⚠️ Esta ação não pode ser desfeita. O estoque será estornado automaticamente.
                </p>
              </div>

              <div>
                <Label className="text-white mb-2 block">Motivo do Cancelamento *</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setCancelDialogOpen(false)}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  disabled={cancelling}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCancelSale}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Status de Entrega */}
      {selectedSale && (
        <Dialog open={deliveryStatusDialogOpen} onOpenChange={setDeliveryStatusDialogOpen}>
          <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Status de Entrega - #{selectedSale.saleNumber}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Atualize o andamento da entrega da venda selecionada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/70 text-sm mb-2">Cliente:</p>
                <p className="text-white font-medium">{selectedSale.clientName}</p>
                {selectedSale.deliveryAddress && (
                  <>
                    <p className="text-white/70 text-sm mt-3 mb-2">Endereço de Entrega:</p>
                    <p className="text-white font-medium">{selectedSale.deliveryAddress}</p>
                  </>
                )}
                <p className="text-white/70 text-sm mt-3 mb-2">Status Atual:</p>
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold ${
                  selectedSale.deliveryStatus === 'entregue' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}>
                  {selectedSale.deliveryStatus === 'entregue' ? 'Entregue' : 'Pendente'}
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleUpdateDeliveryStatus('pendente')}
                  variant="outline"
                  className="flex-1 bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
                  disabled={updatingDeliveryStatus || selectedSale.deliveryStatus === 'pendente'}
                >
                  Marcar como Pendente
                </Button>
                <Button
                  onClick={() => handleUpdateDeliveryStatus('entregue')}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  disabled={updatingDeliveryStatus || selectedSale.deliveryStatus === 'entregue'}
                >
                  {updatingDeliveryStatus ? 'Atualizando...' : 'Marcar como Entregue'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Reimpressao - Tela Cheia */}
      {reprintDialogOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
          <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800 border-b border-white/20 p-4 flex items-center justify-between">
            <h2 className="text-white text-xl font-bold">Comprovante de Venda #{selectedSale.saleNumber}</h2>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  printReceipt();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button
                onClick={() => setReprintDialogOpen(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Fechar
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-white/5 p-8 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-2xl" ref={printRef}>
              <SaleReceipt sale={selectedSale} />
            </div>
          </div>
        </div>
      )}

      {/* Componente de impressão oculto */}
      {selectedSale && !reprintDialogOpen && (
        <div ref={printRef} className="hidden">
          <SaleReceipt sale={selectedSale} />
        </div>
      )}
    </div>
  );
}
