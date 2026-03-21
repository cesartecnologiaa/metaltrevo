import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DollarSign, Calendar, Check, X, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '@/lib/firestoreUtils';
import { formatCurrency } from '@/lib/formatters';
import { useAuthContext } from '@/contexts/AuthContext';
import { AccountReceivable, Installment } from '@/types';
import { 
  getAllAccountsReceivable, 
  markInstallmentAsPaid, 
  markInstallmentAsPending,
  updateOverdueInstallments,
  processPartialPayment
} from '@/services/accountsReceivableService';
import { Timestamp } from 'firebase/firestore';
import PaymentReceipt from '@/components/PaymentReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

export default function AccountsReceivable() {
  const { userData } = useAuthContext();
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'today' | 'next7days'>('all');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [lastPayment, setLastPayment] = useState<{
    account: AccountReceivable;
    installment: Installment;
    paidAmount: number;
    paymentDate: Date;
  } | null>(null);
  const { printRef, printReceipt } = usePrintReceipt();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      await updateOverdueInstallments(); // Atualizar parcelas vencidas
      const accountsData = await getAllAccountsReceivable();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const filterAccountsByDate = (accounts: AccountReceivable[]) => {
    if (quickFilter === 'all') return accounts;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const next7days = new Date(now);
    next7days.setDate(next7days.getDate() + 7);

    return accounts.filter(account => {
      return account.installments.some(inst => {
        if (inst.status === 'paga') return false;
        
        const dueDate = inst.dueDate instanceof Timestamp ? inst.dueDate.toDate() : new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const dueTime = dueDate.getTime();

        if (quickFilter === 'overdue') {
          return dueTime < today;
        } else if (quickFilter === 'today') {
          return dueTime === today;
        } else if (quickFilter === 'next7days') {
          return dueTime >= today && dueTime <= next7days.getTime();
        }
        return false;
      });
    });
  };

  const handleViewDetails = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setDetailsDialogOpen(true);
  };

  const handleOpenPaymentDialog = (installment: Installment) => {
    setSelectedInstallment(installment);
    setPaidAmount(formatCurrency(installment.amount));
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!userData || !selectedAccount || !selectedInstallment) return;

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (amount > selectedInstallment.amount) {
      toast.error('Valor não pode ser maior que o valor da parcela');
      return;
    }

    setProcessing(true);
    try {
      await processPartialPayment(
        selectedAccount.id,
        selectedInstallment.installmentNumber,
        amount,
        userData.uid,
        userData.name
      );
      
      if (amount < selectedInstallment.amount) {
        toast.success(`Pagamento parcial de R$ ${formatCurrency(amount)} registrado. Saldo de R$ ${formatCurrency(selectedInstallment.amount - amount)} adicionado à próxima parcela.`);
      } else {
        toast.success('Parcela paga integralmente');
      }
      
      // Salvar dados do pagamento para impressão
      setLastPayment({
        account: selectedAccount,
        installment: selectedInstallment,
        paidAmount: amount,
        paymentDate: new Date()
      });
      
      await loadAccounts();
      
      // Atualizar conta selecionada
      const updated = accounts.find(a => a.id === selectedAccount.id);
      if (updated) setSelectedAccount(updated);
      
      setPaymentDialogOpen(false);
      
      // Imprimir comprovante após pequeno delay
      setTimeout(() => {
        printReceipt();
      }, 100);
      setPaidAmount('');
      setSelectedInstallment(null);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error?.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleInstallmentStatus = async (
    accountId: string,
    installmentNumber: number,
    currentStatus: 'pendente' | 'paga' | 'vencida' | 'cancelada'
  ) => {
    if (!userData) return;

    setProcessing(true);
    try {
      if (currentStatus === 'paga') {
        await markInstallmentAsPending(accountId, installmentNumber);
        toast.success('Parcela marcada como pendente');
      } else {
        await markInstallmentAsPaid(accountId, installmentNumber, userData.uid, userData.name);
        toast.success('Parcela marcada como paga');
      }
      await loadAccounts();
      
      // Atualizar conta selecionada
      if (selectedAccount && selectedAccount.id === accountId) {
        const updated = accounts.find(a => a.id === accountId);
        if (updated) setSelectedAccount(updated);
      }
    } catch (error: any) {
      console.error('Error toggling installment status:', error);
      toast.error(error?.message || 'Erro ao atualizar parcela');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = formatDateUtil;
  const formatDateTime = formatDateTimeUtil;

  const getStatusColor = (status: 'pendente' | 'paga' | 'parcial' | 'cancelada') => {
    switch (status) {
      case 'paga':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'parcial':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'pendente':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'cancelada':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: 'pendente' | 'paga' | 'parcial' | 'cancelada') => {
    switch (status) {
      case 'paga':
        return 'Paga';
      case 'parcial':
        return 'Parcial';
      case 'pendente':
        return 'Pendente';
      case 'cancelada':
        return 'Cancelada';
    }
  };

  const getInstallmentStatusColor = (status: 'pendente' | 'paga' | 'vencida' | 'cancelada') => {
    switch (status) {
      case 'paga':
        return 'bg-green-500/20 text-green-300';
      case 'vencida':
        return 'bg-red-500/20 text-red-300';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'cancelada':
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getTotalReceivable = () => {
    return accounts
      .filter(acc => acc.status !== 'paga' && acc.status !== 'cancelada')
      .reduce((sum, acc) => {
        const pending = acc.installments
          .filter(inst => inst.status !== 'paga' && inst.status !== 'cancelada')
          .reduce((s, inst) => s + inst.amount, 0);
        return sum + pending;
      }, 0);
  };

  // Filtrar contas por pesquisa e data
  let filteredAccounts = filterAccountsByDate(accounts);
  filteredAccounts = filteredAccounts.filter(account => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      account?.clientName?.toLowerCase().includes(search) ||
      account?.clientDocument?.replace(/[^\d]/g, '').includes(search.replace(/[^\d]/g, ''))
    );
  });

  const getTotalOverdue = () => {
    return accounts
      .filter(acc => acc.status !== 'cancelada')
      .reduce((sum, acc) => {
        const overdue = acc.installments
          .filter(inst => inst.status === 'vencida')
          .reduce((s, inst) => s + inst.amount, 0);
        return sum + overdue;
      }, 0);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contas a Receber</h1>
          <p className="text-white/70">Gerenciar parcelas e pagamentos</p>
        </div>

        {/* Campo de Pesquisa */}
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por nome, CPF ou código do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </Card>

        {/* Filtros Rápidos */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setQuickFilter('all')}
            variant="outline"
            className={`${
              quickFilter === 'all'
                ? 'bg-blue-500/30 border-blue-500/50 text-white'
                : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            Todas
          </Button>
          <Button
            onClick={() => setQuickFilter('overdue')}
            variant="outline"
            className={`${
              quickFilter === 'overdue'
                ? 'bg-red-500/30 border-red-500/50 text-white'
                : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Vencidas
          </Button>
          <Button
            onClick={() => setQuickFilter('today')}
            variant="outline"
            className={`${
              quickFilter === 'today'
                ? 'bg-yellow-500/30 border-yellow-500/50 text-white'
                : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Vencendo Hoje
          </Button>
          <Button
            onClick={() => setQuickFilter('next7days')}
            variant="outline"
            className={`${
              quickFilter === 'next7days'
                ? 'bg-green-500/30 border-green-500/50 text-white'
                : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Próximos 7 dias
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total a Receber</p>
                <p className="text-2xl font-bold text-green-400">
                  R$ {formatCurrency(getTotalReceivable())}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-400/50" />
            </div>
          </Card>

          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Vencidas</p>
                <p className="text-2xl font-bold text-red-400">
                  R$ {formatCurrency(getTotalOverdue())}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400/50" />
            </div>
          </Card>

          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total de Contas</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-white/50" />
            </div>
          </Card>
        </div>

        {/* Lista de Contas */}
        {loading ? (
          <div className="text-center py-12 text-white/70">
            Carregando contas...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Nenhuma conta a receber</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <Card
                key={account.id}
                className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">#{account.saleNumber}</h3>
                      <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${getStatusColor(account.status)}`}>
                        {getStatusLabel(account.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-white/50">Cliente</p>
                        <p className="text-white font-medium">{account.clientName || 'N/A'}</p>
                      </div>

                      <div>
                        <p className="text-white/50">Total</p>
                        <p className="text-green-400 font-bold">R$ {formatCurrency(account.totalAmount)}</p>
                      </div>

                      <div>
                        <p className="text-white/50">Parcelas</p>
                        <p className="text-white font-medium">
                          {account.installments.filter(i => i.status === 'paga').length} / {account.installments.length}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/50">Data</p>
                        <p className="text-white font-medium">{formatDate(account.createdAt)}</p>
                      </div>
                    </div>

                    {/* Próximas parcelas */}
                    <div className="flex gap-2 flex-wrap">
                      {account.installments
                        .filter(inst => inst.status !== 'paga')
                        .slice(0, 3)
                        .map(inst => (
                          <span
                            key={inst.installmentNumber}
                            className={`px-2 py-1 rounded text-xs font-medium ${getInstallmentStatusColor(inst.status)}`}
                          >
                            {inst.installmentNumber}ª: R$ {formatCurrency(inst.amount)} - {formatDate(inst.dueDate)}
                          </span>
                        ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewDetails(account)}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10 ml-4"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Detalhes */}
        {selectedAccount && (
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="max-w-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  Detalhes da Conta #{selectedAccount.saleNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Informações Gerais */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/70 text-sm">Cliente</p>
                      <p className="text-white font-medium">{selectedAccount.clientName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Total</p>
                      <p className="text-green-400 font-bold text-lg">R$ {formatCurrency(selectedAccount.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border ${getStatusColor(selectedAccount.status)}`}>
                        {getStatusLabel(selectedAccount.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Data de Criação</p>
                      <p className="text-white font-medium">{formatDate(selectedAccount.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Lista de Parcelas */}
                <div>
                  <h3 className="text-white font-bold mb-3">Parcelas</h3>
                  <div className="space-y-2">
                    {selectedAccount.installments.map((installment) => (
                      <div
                        key={installment.installmentNumber}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-white font-bold">
                              Parcela {installment.installmentNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getInstallmentStatusColor(installment.status)}`}>
                              {installment.status === 'paga' ? 'Paga' : installment.status === 'vencida' ? 'Vencida' : installment.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-white/70">Valor</p>
                              <p className="text-white font-medium">R$ {formatCurrency(installment.amount)}</p>
                            </div>
                            <div>
                              <p className="text-white/70">Vencimento</p>
                              <p className="text-white font-medium">{formatDate(installment.dueDate)}</p>
                            </div>
                            {installment.paidAt && (
                              <>
                                <div>
                                  <p className="text-white/70">Pago em</p>
                                  <p className="text-white font-medium">{formatDateTime(installment.paidAt)}</p>
                                </div>
                                <div>
                                  <p className="text-white/70">Pago por</p>
                                  <p className="text-white font-medium">{installment.paidByName}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {installment.status === 'cancelada' ? (
                            <span className="text-gray-400 text-sm italic">Parcela cancelada</span>
                          ) : installment.status === 'paga' ? (
                            <Button
                              onClick={() => handleToggleInstallmentStatus(
                                selectedAccount.id,
                                installment.installmentNumber,
                                installment.status
                              )}
                              variant="outline"
                              size="sm"
                              className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                              disabled={processing}
                            >
                              <X className="w-4 h-4 mr-1" /> Desfazer
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleOpenPaymentDialog(installment)}
                              variant="outline"
                              size="sm"
                              className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                              disabled={processing}
                            >
                              <DollarSign className="w-4 h-4 mr-1" /> Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Pagamento Parcial */}
        {selectedInstallment && (
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  Registrar Pagamento - Parcela {selectedInstallment.installmentNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/70 text-sm mb-1">Valor da Parcela</p>
                  <p className="text-white text-2xl font-bold">
                    R$ {formatCurrency(selectedInstallment.amount)}
                  </p>
                </div>

                <div>
                  <label className="text-white mb-2 block font-medium">
                    Valor Recebido *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedInstallment.amount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-white/50 text-sm mt-2">
                    Se o valor for menor que a parcela, o saldo será adicionado automaticamente à próxima parcela.
                  </p>
                </div>

                {parseFloat(paidAmount) > 0 && parseFloat(paidAmount) < selectedInstallment.amount && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-yellow-300 text-sm font-medium">
                      ⚠️ Pagamento Parcial
                    </p>
                    <p className="text-yellow-200 text-sm mt-1">
                      Saldo de R$ {formatCurrency(selectedInstallment.amount - parseFloat(paidAmount.replace('.', '').replace(',', '.')))} será adicionado à próxima parcela.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setPaymentDialogOpen(false);
                      setPaidAmount('');
                      setSelectedInstallment(null);
                    }}
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleProcessPayment}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={processing || !paidAmount || parseFloat(paidAmount) <= 0}
                  >
                    {processing ? 'Processando...' : 'Confirmar Pagamento'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Componente de impressão oculto */}
        {lastPayment && (
          <div ref={printRef} className="hidden">
            <PaymentReceipt
              account={lastPayment.account}
              installment={lastPayment.installment}
              paidAmount={lastPayment.paidAmount}
              paymentDate={lastPayment.paymentDate}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
