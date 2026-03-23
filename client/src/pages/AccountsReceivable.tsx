import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  registerInstallmentPayment,
  updateOverdueInstallments,
} from '@/services/accountsReceivableService';
import { Timestamp } from 'firebase/firestore';
import PaymentReceipt from '@/components/PaymentReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

type SelectedInstallmentState = {
  accountId: string;
  account: AccountReceivable;
  installment: Installment;
};

function parseMoneyValue(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  const [selectedPayment, setSelectedPayment] = useState<SelectedInstallmentState | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [lastPayment, setLastPayment] = useState<{
    account: AccountReceivable;
    installment: Installment;
    paidAmount: number;
    paymentDate: Date;
  } | null>(null);
  const { printRef, printReceipt } = usePrintReceipt();

  useEffect(() => {
    const url = new URL(window.location.href);
    const client = url.searchParams.get('client');
    if (client) {
      setSearchTerm(client);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      await updateOverdueInstallments();
      const accountsData = await getAllAccountsReceivable();
      setAccounts(accountsData);

      setSelectedAccount((prev) => {
        if (!prev) return prev;
        const updated = accountsData.find((acc) => acc.id === prev.id);
        return updated || prev;
      });

      setSelectedPayment((prev) => {
        if (!prev) return prev;
        const updatedAccount = accountsData.find((acc) => acc.id === prev.accountId);
        if (!updatedAccount) return prev;

        const updatedInstallment = updatedAccount.installments.find(
          (inst) => inst.installmentNumber === prev.installment.installmentNumber
        );

        if (!updatedInstallment) return null;

        return {
          accountId: updatedAccount.id,
          account: updatedAccount,
          installment: updatedInstallment,
        };
      });
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const filterAccountsByDate = (items: AccountReceivable[]) => {
    if (quickFilter === 'all') return items;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    const next7days = new Date(now);
    next7days.setDate(next7days.getDate() + 7);

    return items.filter(account => {
      return account.installments.some(inst => {
        if (inst.status === 'paga' || inst.status === 'cancelada') return false;

        const dueDate = inst.dueDate instanceof Timestamp ? inst.dueDate.toDate() : new Date(inst.dueDate as any);
        dueDate.setHours(0, 0, 0, 0);
        const dueTime = dueDate.getTime();

        if (quickFilter === 'overdue') return dueTime < today;
        if (quickFilter === 'today') return dueTime === today;
        if (quickFilter === 'next7days') return dueTime >= today && dueTime <= next7days.getTime();
        return false;
      });
    });
  };

  const handleViewDetails = (account: AccountReceivable) => {
    setSelectedAccount(account);
    setDetailsDialogOpen(true);
  };

  const handleOpenPaymentDialog = (account: AccountReceivable, installment: Installment) => {
    setSelectedPayment({ accountId: account.id, account, installment });
    setPaymentAmount(String(Number(installment.amount || 0).toFixed(2)));
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!userData || !selectedPayment) return;

    const amount = parseMoneyValue(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setProcessing(true);
    try {
      const result = await registerInstallmentPayment(
        selectedPayment.accountId,
        selectedPayment.installment.installmentNumber,
        amount,
        userData.uid,
        userData.name
      );

      const installmentAmount = Number(selectedPayment.installment.amount || 0);
      if (amount > installmentAmount && result.excessApplied) {
        toast.success(`Pagamento registrado. Excedente de ${formatCurrency(result.excessApplied)} abatido nas próximas parcelas.`);
      } else if (amount < installmentAmount && result.remainingGenerated) {
        toast.success(`Pagamento parcial registrado. Restante de ${formatCurrency(result.remainingGenerated)} lançado na próxima cobrança.`);
      } else {
        toast.success('Pagamento registrado com sucesso');
      }

      setLastPayment({
        account: selectedPayment.account,
        installment: selectedPayment.installment,
        paidAmount: amount,
        paymentDate: new Date(),
      });

      await loadAccounts();

      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedPayment(null);

      setTimeout(() => {
        printReceipt();
      }, 100);
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
      case 'paga': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'parcial': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'pendente': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'cancelada': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: 'pendente' | 'paga' | 'parcial' | 'cancelada') => {
    switch (status) {
      case 'paga': return 'Paga';
      case 'parcial': return 'Parcial';
      case 'pendente': return 'Pendente';
      case 'cancelada': return 'Cancelada';
    }
  };

  const getInstallmentStatusColor = (status: 'pendente' | 'paga' | 'vencida' | 'cancelada') => {
    switch (status) {
      case 'paga': return 'bg-green-500/20 text-green-300';
      case 'vencida': return 'bg-red-500/20 text-red-300';
      case 'pendente': return 'bg-yellow-500/20 text-yellow-300';
      case 'cancelada': return 'bg-gray-500/20 text-gray-300';
    }
  };

  const totalReceivable = useMemo(() => {
    return accounts
      .filter(acc => acc.status !== 'paga' && acc.status !== 'cancelada')
      .reduce((sum, acc) => {
        const pending = acc.installments
          .filter(inst => inst.status !== 'paga' && inst.status !== 'cancelada')
          .reduce((s, inst) => s + Number(inst.amount || 0), 0);
        return sum + pending;
      }, 0);
  }, [accounts]);

  const totalOverdue = useMemo(() => {
    return accounts
      .filter(acc => acc.status !== 'cancelada')
      .reduce((sum, acc) => {
        const overdue = acc.installments
          .filter(inst => inst.status === 'vencida')
          .reduce((s, inst) => s + Number(inst.amount || 0), 0);
        return sum + overdue;
      }, 0);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let filtered = filterAccountsByDate(accounts);
    if (!searchTerm) return filtered;
    const search = searchTerm.toLowerCase();
    return filtered.filter(account => (
      account?.clientName?.toLowerCase().includes(search) ||
      account?.clientDocument?.replace(/[^\d]/g, '').includes(search.replace(/[^\d]/g, '')) ||
      account?.saleNumber?.toLowerCase().includes(search)
    ));
  }, [accounts, quickFilter, searchTerm]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contas a Receber</h1>
          <p className="text-white/70">Gerenciar parcelas e pagamentos</p>
        </div>

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

        <div className="flex gap-2 flex-wrap">
          {[
            ['all', 'Todas'],
            ['overdue', 'Vencidas'],
            ['today', 'Vencendo Hoje'],
            ['next7days', 'Próximos 7 dias'],
          ].map(([value, label]) => (
            <Button
              key={value}
              onClick={() => setQuickFilter(value as any)}
              variant="outline"
              className={
                quickFilter === value
                  ? value === 'overdue'
                    ? 'bg-red-500/30 border-red-500/50 text-white'
                    : value === 'today'
                      ? 'bg-yellow-500/30 border-yellow-500/50 text-white'
                      : value === 'next7days'
                        ? 'bg-green-500/30 border-green-500/50 text-white'
                        : 'bg-blue-500/30 border-blue-500/50 text-white'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }
            >
              {value !== 'all' && <Calendar className="w-4 h-4 mr-2" />}
              {value === 'overdue' && <AlertCircle className="w-4 h-4 mr-2" />}
              {label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total a Receber</p>
                <p className="text-2xl font-bold text-green-400">R$ {formatCurrency(totalReceivable)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-400/50" />
            </div>
          </Card>
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Vencidas</p>
                <p className="text-2xl font-bold text-red-400">R$ {formatCurrency(totalOverdue)}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400/50" />
            </div>
          </Card>
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total de Contas</p>
                <p className="text-2xl font-bold text-white">{accounts.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-white/50" />
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/70">Carregando contas...</div>
        ) : filteredAccounts.length === 0 ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Nenhuma conta a receber</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all">
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

                    <div className="flex gap-2 flex-wrap">
                      {account.installments
                        .filter(inst => inst.status !== 'paga')
                        .slice(0, 3)
                        .map(inst => (
                          <span key={inst.installmentNumber} className={`px-2 py-1 rounded text-xs font-medium ${getInstallmentStatusColor(inst.status)}`}>
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

        {selectedAccount && (
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="max-w-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">Detalhes da Conta #{selectedAccount.saleNumber}</DialogTitle>
                <DialogDescription className="text-white/70">
                  Visualize as parcelas e registre pagamentos completos, parciais ou com valor excedente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
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

                <div>
                  <h3 className="text-white font-bold mb-3">Parcelas</h3>
                  <div className="space-y-2">
                    {selectedAccount.installments.map((installment) => (
                      <div key={installment.installmentNumber} className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-white font-bold">Parcela {installment.installmentNumber}</span>
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
                                  <p className="text-white font-medium">{(installment as any).paidByName}</p>
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
                              onClick={() => handleToggleInstallmentStatus(selectedAccount.id, installment.installmentNumber, installment.status)}
                              variant="outline"
                              size="sm"
                              className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                              disabled={processing}
                            >
                              <X className="w-4 h-4 mr-1" /> Desfazer
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleOpenPaymentDialog(selectedAccount, installment)}
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

        {selectedPayment && (
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  Registrar Pagamento - Parcela {selectedPayment.installment.installmentNumber}
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  Digite o valor recebido. Se pagar menos, o restante vai para a próxima cobrança. Se pagar mais, o excedente abate a próxima em aberto.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-white mb-2 block font-medium">Valor da parcela</label>
                  <Input
                    value={String(Number(selectedPayment.installment.amount || 0).toFixed(2))}
                    readOnly
                    className="bg-white/5 border-white/10 text-white/70"
                  />
                </div>

                <div>
                  <label className="text-white mb-2 block font-medium">Valor recebido *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="bg-white/10 border-white/20 text-white text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-white mb-2 block font-medium">Atalhos rápidos</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button type="button" variant="outline" onClick={() => setPaymentAmount(String(Number(selectedPayment.installment.amount || 0).toFixed(2)))} className="bg-white/5 border-white/20 text-white hover:bg-white/10">Quitar</Button>
                    <Button type="button" variant="outline" onClick={() => setPaymentAmount(String(Number((Number(selectedPayment.installment.amount || 0) / 2).toFixed(2))))} className="bg-white/5 border-white/20 text-white hover:bg-white/10">50%</Button>
                    <Button type="button" variant="outline" onClick={() => setPaymentAmount(String(Number((Number(selectedPayment.installment.amount || 0) * 0.25).toFixed(2))))} className="bg-white/5 border-white/20 text-white hover:bg-white/10">25%</Button>
                    <Button type="button" variant="outline" onClick={() => setPaymentAmount('')} className="bg-white/5 border-white/20 text-white hover:bg-white/10">Limpar</Button>
                  </div>
                </div>

                {parseMoneyValue(paymentAmount) > 0 && parseMoneyValue(paymentAmount) < Number(selectedPayment.installment.amount || 0) && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-yellow-300 text-sm font-medium">⚠️ Pagamento parcial</p>
                    <p className="text-yellow-200 text-sm mt-1">
                      Restante de R$ {formatCurrency(Number(selectedPayment.installment.amount || 0) - parseMoneyValue(paymentAmount))} será lançado na próxima cobrança em aberto.
                    </p>
                  </div>
                )}

                {parseMoneyValue(paymentAmount) > Number(selectedPayment.installment.amount || 0) && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-emerald-300 text-sm font-medium">💸 Pagamento com excedente</p>
                    <p className="text-emerald-200 text-sm mt-1">
                      Excedente de R$ {formatCurrency(parseMoneyValue(paymentAmount) - Number(selectedPayment.installment.amount || 0))} será abatido na próxima parcela em aberto.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setPaymentDialogOpen(false);
                      setPaymentAmount('');
                      setSelectedPayment(null);
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
                    disabled={processing || parseMoneyValue(paymentAmount) <= 0}
                  >
                    {processing ? 'Processando...' : 'Confirmar Pagamento'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
