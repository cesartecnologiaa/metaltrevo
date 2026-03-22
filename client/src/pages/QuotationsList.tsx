import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Eye, FileText, Calendar, DollarSign, User, CheckCircle, XCircle, Clock, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/firestoreUtils';
import { formatCurrency } from '@/lib/formatters';
import { useAuthContext } from '@/contexts/AuthContext';
import { Quotation, getQuotations, convertQuotationToSale, updateExpiredQuotations, cancelQuotation } from '@/services/quotationService';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethod } from '@/types';
import { Timestamp } from 'firebase/firestore';
import QuotationReceipt from '@/components/QuotationReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

export default function QuotationsList() {
  const { userData } = useAuthContext();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  
  // Modal de detalhes
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  // Modal de conversão
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [converting, setConverting] = useState(false);
  
  // Modal de cancelamento
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  
  // Modal de reimpressao
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const { printRef, printReceipt } = usePrintReceipt();

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      await updateExpiredQuotations(); // Atualizar status de vencidos
      const data = await getQuotations();
      setQuotations(data);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDetailsDialogOpen(true);
  };

  const handleOpenConvertDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setPaymentMethod('dinheiro');
    setInstallmentCount(1);
    setConvertDialogOpen(true);
  };

  const handleConvertToSale = async () => {
    if (!selectedQuotation || !userData) return;

    if ((paymentMethod === 'boleto' || paymentMethod === 'cartao_credito') && installmentCount < 1) {
      toast.error('Número de parcelas inválido');
      return;
    }

    setConverting(true);
    try {
      await convertQuotationToSale(
        selectedQuotation.id,
        selectedQuotation,
        paymentMethod,
        installmentCount,
        userData.uid,
        userData.name
      );
      
      toast.success('Orçamento convertido em venda com sucesso!');
      setConvertDialogOpen(false);
      await loadQuotations();
    } catch (error: any) {
      console.error('Error converting quotation:', error);
      toast.error(error.message || 'Erro ao converter orçamento');
    } finally {
      setConverting(false);
    }
  };

  const handleOpenCancelDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleOpenReprintDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setReprintDialogOpen(true);
  };

  const handlePrintQuotation = () => {
    printReceipt();
  };

  const handleCancelQuotation = async () => {
    if (!selectedQuotation || !userData) return;

    if (!cancelReason.trim()) {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    setCanceling(true);
    try {
      await cancelQuotation(
        selectedQuotation.id,
        cancelReason.trim(),
        userData.uid,
        userData.name
      );
      
      toast.success('Orçamento cancelado com sucesso!');
      setCancelDialogOpen(false);
      setDetailsDialogOpen(false);
      await loadQuotations();
    } catch (error: any) {
      console.error('Error canceling quotation:', error);
      toast.error(error.message || 'Erro ao cancelar orçamento');
    } finally {
      setCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendente
        </span>;
      case 'convertido':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Convertido
        </span>;
      case 'vencido':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Vencido
        </span>;
      case 'cancelada':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Cancelada
        </span>;
      default:
        return null;
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    // Filtro de busca
    const matchesSearch = 
      quotation.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quotation.clientDocument && quotation.clientDocument.includes(searchTerm));

    // Filtro de status
    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;

    // Filtro de data
    let matchesDate = true;
    if (filterDateStart || filterDateEnd) {
      const quotationDate = quotation.date instanceof Timestamp 
        ? quotation.date.toDate() 
        : new Date(quotation.date);
      const startDate = filterDateStart ? new Date(filterDateStart) : null;
      const endDate = filterDateEnd ? new Date(filterDateEnd) : null;

      if (startDate && quotationDate < startDate) matchesDate = false;
      if (endDate && quotationDate > endDate) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getTotalByStatus = (status: string) => {
    return quotations.filter(q => q.status === status).length;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Carregando orçamentos...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Consulta de Orçamentos
            </h1>
            <p className="text-white/60 mt-1">Visualize e converta orçamentos em vendas</p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300/70 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-300">{getTotalByStatus('pendente')}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-300/50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300/70 text-sm">Convertidos</p>
                <p className="text-2xl font-bold text-green-300">{getTotalByStatus('convertido')}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-300/50" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300/70 text-sm">Vencidos</p>
                <p className="text-2xl font-bold text-red-300">{getTotalByStatus('vencido')}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-300/50" />
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <Input
                placeholder="Buscar por código, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Data inicial"
            />

            <Input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Data final"
            />
          </div>
        </Card>

        {/* Lista de orçamentos */}
        <div className="grid grid-cols-1 gap-4">
          {filteredQuotations.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">Nenhum orçamento encontrado</p>
            </Card>
          ) : (
            filteredQuotations.map((quotation) => (
              <Card
                key={quotation.id}
                className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">#{quotation.code}</h3>
                      {getStatusBadge(quotation.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-white/50 flex items-center gap-1">
                          <User className="w-3 h-3" /> Cliente
                        </p>
                        <p className="text-white font-medium">{quotation.clientName}</p>
                      </div>
                      <div>
                        <p className="text-white/50 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Data
                        </p>
                        <p className="text-white font-medium">{formatDate(quotation.date)}</p>
                      </div>
                      <div>
                        <p className="text-white/50 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Validade
                        </p>
                        <p className="text-white font-medium">{formatDate(quotation.validUntil)}</p>
                      </div>
                      <div>
                        <p className="text-white/50 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Total
                        </p>
                        <p className="text-green-400 font-bold">R$ {formatCurrency(quotation.total)}</p>
                      </div>
                    </div>

                    <p className="text-white/50 text-xs">
                      {quotation.items.length} {quotation.items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewDetails(quotation)}
                      variant="outline"
                      size="sm"
                      className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                    
                    <Button
                      onClick={() => handleOpenReprintDialog(quotation)}
                      variant="outline"
                      size="sm"
                      className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                    >
                      <Printer className="w-4 h-4 mr-1" /> Reimprimir
                    </Button>
                    
                    {quotation.status === 'pendente' && (
                      <>
                        <Button
                          onClick={() => handleOpenConvertDialog(quotation)}
                          variant="outline"
                          size="sm"
                          className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Converter
                        </Button>
                        <Button
                          onClick={() => handleOpenCancelDialog(quotation)}
                          variant="outline"
                          size="sm"
                          className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Modal de detalhes */}
        {selectedQuotation && (
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
             <DialogHeader>
  <DialogTitle className="text-2xl">Detalhes do Orçamento #{selectedQuotation.code}</DialogTitle>
  <DialogDescription className="text-white/70">
    Visualize os produtos, valores e informações completas deste orçamento.
  </DialogDescription>
</DialogHeader>

              <div className="space-y-4">
                {/* Informações gerais */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white/50 text-sm">Cliente</p>
                    <p className="text-white font-medium">{selectedQuotation.clientName}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Status</p>
                    {getStatusBadge(selectedQuotation.status)}
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Data de Emissão</p>
                    <p className="text-white font-medium">{formatDate(selectedQuotation.date)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Válido até</p>
                    <p className="text-white font-medium">{formatDate(selectedQuotation.validUntil)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Vendedor</p>
                    <p className="text-white font-medium">{selectedQuotation.sellerName}</p>
                  </div>
                  {selectedQuotation.convertedAt && (
                    <div>
                      <p className="text-white/50 text-sm">Convertido em</p>
                      <p className="text-white font-medium">{formatDateTime(selectedQuotation.convertedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Itens */}
                <div>
                  <h3 className="text-white font-bold mb-2">Itens do Orçamento</h3>
                  <div className="space-y-2">
                    {selectedQuotation.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.productName}</p>
                          <p className="text-white/50 text-sm">
                            {item.quantity}x R$ {formatCurrency(item.unitPrice)} ({item.priceType === 'vista' ? 'À Vista' : 'A Prazo'})
                          </p>
                        </div>
                        <p className="text-green-400 font-bold">R$ {formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="p-4 bg-white/5 rounded-lg space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>R$ {formatCurrency(selectedQuotation.subtotal)}</span>
                  </div>
                  {selectedQuotation.discount > 0 && (
                    <div className="flex justify-between text-red-300">
                      <span>Desconto</span>
                      <span>- R$ {formatCurrency(selectedQuotation.discount)}</span>
                    </div>
                  )}
                  {selectedQuotation.deliveryFee > 0 && (
                    <div className="flex justify-between text-white/70">
                      <span>Frete</span>
                      <span>R$ {formatCurrency(selectedQuotation.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span className="text-green-400">R$ {formatCurrency(selectedQuotation.total)}</span>
                  </div>
                </div>

                {selectedQuotation.observations && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-white/50 text-sm mb-1">Observações</p>
                    <p className="text-white">{selectedQuotation.observations}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de conversão */}
        {selectedQuotation && (
          <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
            <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
              <DialogHeader>
  <DialogTitle>Converter Orçamento em Venda</DialogTitle>
  <DialogDescription className="text-white/70">
    Confirme os dados para transformar este orçamento em uma venda.
  </DialogDescription>
</DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white/70 text-sm">Orçamento</p>
                  <p className="text-white font-bold text-lg">#{selectedQuotation.code}</p>
                  <p className="text-green-400 font-bold">R$ {formatCurrency(selectedQuotation.total)}</p>
                </div>

                <div>
                  <Label className="text-white">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(paymentMethod === 'boleto' || paymentMethod === 'cartao_credito') && (
                  <div>
                    <Label className="text-white">Número de Parcelas</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-white/50 text-xs mt-1">
                      {installmentCount}x de R$ {formatCurrency((selectedQuotation.total / installmentCount))}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleConvertToSale}
                    disabled={converting}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    {converting ? 'Convertendo...' : 'Confirmar Conversão'}
                  </Button>
                  <Button
                    onClick={() => setConvertDialogOpen(false)}
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de cancelamento */}
        {selectedQuotation && (
          <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
              <DialogHeader>
  <DialogTitle>Cancelar Orcamento</DialogTitle>
  <DialogDescription className="text-white/70">
    Informe o motivo e confirme o cancelamento do orçamento selecionado.
  </DialogDescription>
</DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-red-300 text-sm">Atencao: Esta acao nao pode ser desfeita. O orcamento sera marcado como cancelado.</p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-white/70 text-sm">Orcamento</p>
                  <p className="text-white font-bold text-lg">#{selectedQuotation.code}</p>
                  <p className="text-white/70 text-sm mt-2">Cliente: {selectedQuotation.clientName}</p>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Motivo do Cancelamento *</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Digite o motivo do cancelamento..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCancelQuotation}
                    disabled={canceling || !cancelReason.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {canceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                  </Button>
                  <Button
                    onClick={() => setCancelDialogOpen(false)}
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Reimpressao - Tela Cheia */}
        {reprintDialogOpen && selectedQuotation && (
          <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800 border-b border-white/20 p-4 flex items-center justify-between">
              <h2 className="text-white text-xl font-bold">Orcamento #{selectedQuotation.code}</h2>
              <div className="flex gap-3">
                <Button
                  onClick={handlePrintQuotation}
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
              <div style={{ display: 'none' }}>
                <QuotationReceipt
                  ref={printRef}
                  quotation={selectedQuotation}
                />
              </div>
              <div className="bg-white rounded-lg shadow-2xl" style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
                <QuotationReceipt
                  quotation={selectedQuotation}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
