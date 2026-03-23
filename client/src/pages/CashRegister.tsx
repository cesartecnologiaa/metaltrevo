import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cashService, CashRegister as CashRegisterType, CashWithdrawal } from '@/services/cashService';
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateCashClosingReport } from '@/utils/cashReportPDF';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { formatCurrency, formatPaymentMethod } from '@/lib/formatters';
import CashClosureReceipt from '@/components/CashClosureReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

export default function CashRegister() {
  const { userData } = useAuthContext();
  const { settings } = useCompanySettings();
  const { printRef, printReceipt } = usePrintReceipt();
  const [loading, setLoading] = useState(false);
  const [cashRegister, setCashRegister] = useState<CashRegisterType | null>(null);
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [closedCashData, setClosedCashData] = useState<any>(null);
  
  // Estados para diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [withdrawalDialog, setWithdrawalDialog] = useState(false);
  
  // Estados para formulários
  const [initialBalance, setInitialBalance] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');

  useEffect(() => {
    loadCashRegister();
  }, []);

  const getSaleCashImpact = (sale: any) => {
    const total = Number(sale?.total || sale?.totalAmount || 0);
    const boletoEntry = Number(sale?.boletoEntryAmount || 0);
    if (sale?.paymentMethod === 'boleto') {
      return Math.max(0, Math.min(boletoEntry, total));
    }
    return total;
  };

  const loadCashRegister = async () => {
    try {
      setLoading(true);
      const openCash = await cashService.getOpenCashRegister();
      setCashRegister(openCash);

      if (openCash) {
        const [withdrawalsData, salesData] = await Promise.all([
          cashService.getWithdrawals(openCash.id!),
          cashService.getTodaySales(),
        ]);
        setWithdrawals(withdrawalsData);
        setSales(salesData);
      }
    } catch (error) {
      console.error('Error loading cash register:', error);
      toast.error('Erro ao carregar caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCash = async () => {
    if (!initialBalance || parseFloat(initialBalance) < 0) {
      toast.error('Informe um saldo inicial válido');
      return;
    }

    try {
      setLoading(true);
      await cashService.openCashRegister(
        parseFloat(initialBalance),
        userData?.uid || '',
        userData?.name || 'Usuário'
      );
      toast.success('Caixa aberto com sucesso!');
      setOpenDialog(false);
      setInitialBalance('');
      await loadCashRegister();
    } catch (error) {
      console.error('Error opening cash:', error);
      toast.error('Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCash = async () => {
    if (!cashRegister) return;

    try {
      setLoading(true);
      const totalSales = sales.reduce((sum, sale) => sum + getSaleCashImpact(sale), 0);
      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      const finalBalance = cashRegister.initialBalance + totalSales - totalWithdrawals;

      await cashService.closeCashRegister(
        cashRegister.id!,
        finalBalance,
        totalSales,
        totalWithdrawals,
        userData?.uid || '',
        userData?.name || 'Usuário'
      );

      // Preparar dados para o comprovante
      const closureData = {
        openedAt: cashRegister.openedAt,
        closedAt: new Date(),
        openedByName: cashRegister.openedByName,
        closedByName: userData?.name || 'Usuário',
        initialBalance: cashRegister.initialBalance,
        totalSales,
        totalWithdrawals,
        finalBalance,
      };

      setClosedCashData(closureData);

      // Aguardar um momento para o componente renderizar
      setTimeout(() => {
        printReceipt();
      }, 100);

      toast.success('Caixa fechado com sucesso!');
      setCloseDialog(false);
      await loadCashRegister();
    } catch (error) {
      console.error('Error closing cash:', error);
      toast.error('Erro ao fechar caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!cashRegister) return;

    try {
      await generateCashClosingReport({
        cashRegister,
        salesByPaymentMethod,
        withdrawals,
        totalSales,
        totalWithdrawals,
        finalBalance: currentBalance,
        companySettings: settings,
      });
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleAddWithdrawal = async () => {
    if (!cashRegister) return;
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!withdrawalReason.trim()) {
      toast.error('Informe o motivo da sangria');
      return;
    }

    try {
      setLoading(true);
      await cashService.addWithdrawal(
        cashRegister.id!,
        parseFloat(withdrawalAmount),
        withdrawalReason,
        userData?.uid || '',
        userData?.name || 'Usuário'
      );

      toast.success('Sangria registrada com sucesso!');
      setWithdrawalDialog(false);
      setWithdrawalAmount('');
      setWithdrawalReason('');
      await loadCashRegister();
    } catch (error) {
      console.error('Error adding withdrawal:', error);
      toast.error('Erro ao registrar sangria');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + getSaleCashImpact(sale), 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const currentBalance = cashRegister
    ? cashRegister.initialBalance + totalSales - totalWithdrawals
    : 0;

  // Agrupar vendas por forma de pagamento
  const salesByPaymentMethod = sales.reduce((acc, sale) => {
    const method = (sale as any).paymentMethod || 'Não informado';
    if (!acc[method]) {
      acc[method] = { count: 0, total: 0 };
    }
    acc[method].count++;
    acc[method].total += getSaleCashImpact(sale);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Caixa</h1>
            <p className="text-white/70">Gerenciamento de caixa e sangrias</p>
          </div>
          {!cashRegister && (
            <Button onClick={() => setOpenDialog(true)} className="bg-green-600 hover:bg-green-700">
              <DollarSign className="w-4 h-4 mr-2" />
              Abrir Caixa
            </Button>
          )}
          {cashRegister && (
            <div className="flex gap-2">
              <Button 
                onClick={handleGeneratePDF} 
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={() => setWithdrawalDialog(true)} variant="outline">
                <TrendingDown className="w-4 h-4 mr-2" />
                Sangria
              </Button>
              <Button onClick={() => setCloseDialog(true)} className="bg-red-600 hover:bg-red-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Fechar Caixa
              </Button>
            </div>
          )}
        </div>

        {/* Status do Caixa */}
        {!cashRegister && !loading && (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-8 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <h3 className="text-xl font-semibold text-white mb-2">Caixa Fechado</h3>
              <p className="text-white/70 mb-4">Abra o caixa para começar a registrar vendas</p>
            </CardContent>
          </Card>
        )}

        {/* Cards de Resumo */}
        {cashRegister && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/10 border-white/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">Saldo Inicial</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    R$ {cashRegister.initialBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">Vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-400">
                    +R$ {totalSales.toFixed(2)}
                  </p>
                  <p className="text-sm text-white/50">{sales.length} vendas</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">Sangrias</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-400">
                    -R$ {totalWithdrawals.toFixed(2)}
                  </p>
                  <p className="text-sm text-white/50">{withdrawals.length} sangrias</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">Saldo Atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">
                    R$ {currentBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vendas por Forma de Pagamento */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(salesByPaymentMethod).map(([method, data]: [string, any]) => (
                    <div key={method} className="flex justify-between items-center p-3 bg-white/5 rounded">
                      <div>
                        <p className="text-white font-medium">
                          {formatPaymentMethod(method)}
                        </p>
                        <p className="text-white/50 text-sm">{data.count} {data.count === 1 ? 'venda' : 'vendas'}</p>
                      </div>
                      <p className="text-white font-bold">R$ {formatCurrency(data.total)}</p>
                    </div>
                  ))}
                  {Object.keys(salesByPaymentMethod).length === 0 && (
                    <p className="text-white/50 text-center py-4">Nenhuma venda registrada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sangrias */}
            {withdrawals.length > 0 && (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Sangrias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex justify-between items-center p-3 bg-white/5 rounded">
                        <div>
                          <p className="text-white font-medium">{withdrawal.reason}</p>
                          <p className="text-white/50 text-sm">
                            {format(withdrawal.createdAt, 'dd/MM/yyyy HH:mm')} - {withdrawal.createdByName}
                          </p>
                        </div>
                        <p className="text-red-400 font-bold">-R$ {withdrawal.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Dialog: Abrir Caixa */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle>Abrir Caixa</DialogTitle>
              <DialogDescription className="text-gray-400">
                Informe o saldo inicial do caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="initialBalance">Saldo Inicial (R$)</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleOpenCash} disabled={loading} className="bg-green-600 hover:bg-green-700">
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Fechar Caixa */}
        <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
          <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fechar Caixa</DialogTitle>
              <DialogDescription className="text-gray-400">
                Revise o relatório antes de fechar o caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded">
                  <p className="text-sm text-white/70">Saldo Inicial</p>
                  <p className="text-xl font-bold text-white">
                    R$ {cashRegister?.initialBalance.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded">
                  <p className="text-sm text-white/70">Total de Vendas</p>
                  <p className="text-xl font-bold text-green-400">
                    +R$ {totalSales.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded">
                  <p className="text-sm text-white/70">Total de Sangrias</p>
                  <p className="text-xl font-bold text-red-400">
                    -R$ {totalWithdrawals.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded">
                  <p className="text-sm text-white/70">Saldo Final</p>
                  <p className="text-xl font-bold text-white">
                    R$ {currentBalance.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/50">
                Aberto em: {cashRegister && format(cashRegister.openedAt, 'dd/MM/yyyy HH:mm')} por {cashRegister?.openedByName}
              </p>
            </div>
            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleGeneratePDF}
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCloseDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCloseCash} disabled={loading} className="bg-red-600 hover:bg-red-700">
                  Confirmar Fechamento
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Sangria */}
        <Dialog open={withdrawalDialog} onOpenChange={setWithdrawalDialog}>
          <DialogContent className="bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle>Registrar Sangria</DialogTitle>
              <DialogDescription className="text-gray-400">
                Retirada de valores do caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="withdrawalAmount">Valor (R$)</Label>
                <Input
                  id="withdrawalAmount"
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="withdrawalReason">Motivo</Label>
                <Input
                  id="withdrawalReason"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  placeholder="Ex: Troco, Despesas, etc."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawalDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddWithdrawal} disabled={loading}>
                Registrar Sangria
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comprovante de Fechamento de Caixa (oculto, apenas para impressão) */}
        {closedCashData && (
          <CashClosureReceipt
            ref={printRef}
            cashRegister={closedCashData}
          />
        )}
      </div>
    </Layout>
  );
}
