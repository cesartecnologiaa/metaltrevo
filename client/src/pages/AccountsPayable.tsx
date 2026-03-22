import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, DollarSign, Check, Trash2, FileDown, Calendar, AlertCircle, Clock, TrendingUp, List } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTimeCompact } from '@/lib/firestoreUtils';
import { formatCurrency } from '@/lib/formatters';
import jsPDF from 'jspdf';
import { addPDFHeader, addPDFFooter } from '@/utils/pdfHeader';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import * as XLSX from 'xlsx';
import { useAuthContext } from '@/contexts/AuthContext';
import { AccountPayable, createAccountPayable, getAccountsPayable, markInstallmentAsPaid, deleteAccountPayable } from '@/services/accountsPayableService';

export default function AccountsPayable() {
  const { userData } = useAuthContext();
  const { settings } = useCompanySettings();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form states
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('outros');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'today' | 'next7days'>('all');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccountsPayable();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!userData || !description || !totalAmount || !firstDueDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);
    try {
      // Converter data corretamente para evitar problema de fuso horário
      const [year, month, day] = firstDueDate.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day); // month é 0-indexed
      
      await createAccountPayable(
        description,
        category,
        parseFloat(totalAmount),
        installmentCount,
        dueDate,
        userData.uid,
        userData.name
      );
      
      toast.success('Conta criada com sucesso!');
      setCreateDialogOpen(false);
      resetForm();
      await loadAccounts();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (accountId: string, installmentNumber: number) => {
    if (!userData) return;

    try {
      await markInstallmentAsPaid(accountId, installmentNumber, 'dinheiro', userData.uid, userData.name);
      toast.success('Parcela marcada como paga!');
      await loadAccounts();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error(error.message || 'Erro ao marcar como paga');
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    
    try {
      await deleteAccountPayable(accountId);
      toast.success('Conta excluída com sucesso!');
      await loadAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Erro ao excluir conta');
    }
  };

  const handleExportPDF = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filtrar contas que têm parcelas no período (pagas OU pendentes)
    const filtered = accounts.filter(acc => 
      acc.installments.some(inst => {
        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : inst.dueDate.toDate();
        return dueDate >= start && dueDate <= end;
      })
    );

    if (filtered.length === 0) {
      toast.error('Nenhuma conta no período selecionado');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Adicionar cabeçalho padronizado
    let y = await addPDFHeader(
      doc,
      settings,
      'Contas a Pagar - Relatório',
      `Período: ${formatDate(start)} a ${formatDate(end)}`
    );
    let total = 0;

    filtered.forEach(acc => {
      // Filtrar parcelas que vencem no período
      const instsInPeriod = acc.installments.filter(inst => {
        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : inst.dueDate.toDate();
        return dueDate >= start && dueDate <= end;
      });

      instsInPeriod.forEach(inst => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(acc.description, 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`Categoria: ${acc.category}`, 15, y + 5);
        doc.text(`Parcela ${inst.installmentNumber}/${acc.installments.length}`, 15, y + 10);
        if (inst.status === 'paga' && inst.paidAt) {
          doc.text(`Pago em: ${formatDateTimeCompact(inst.paidAt)}`, 15, y + 15);
        } else {
          doc.setTextColor(255, 100, 100);
          doc.text(`PENDENTE - Venc: ${formatDate(inst.dueDate)}`, 15, y + 15);
          doc.setTextColor(0, 0, 0);
        }
        doc.text(`Valor: ${formatCurrency(inst.amount)}`, 150, y + 15);
        
        y += 25;
        total += inst.amount;
      });
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL PAGO: ${formatCurrency(total)}`, 150, y + 10);

    // Adicionar rodapé padronizado
    addPDFFooter(doc);
    
    doc.save(`contas-pagas-${formatDate(start)}-${formatDate(end)}.pdf`);
    toast.success('PDF gerado com sucesso!');
    setExportDialogOpen(false);
  };

  const handleExportExcel = () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filtrar contas que têm parcelas no período (pagas OU pendentes)
    const filtered = accounts.filter(acc => 
      acc.installments.some(inst => {
        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : inst.dueDate.toDate();
        return dueDate >= start && dueDate <= end;
      })
    );

    if (filtered.length === 0) {
      toast.error('Nenhuma conta no período selecionado');
      return;
    }

    const data: any[] = [];
    let total = 0;

    filtered.forEach(acc => {
      // Filtrar parcelas que vencem no período
      const instsInPeriod = acc.installments.filter(inst => {
        const dueDate = inst.dueDate instanceof Date ? inst.dueDate : inst.dueDate.toDate();
        return dueDate >= start && dueDate <= end;
      });

      instsInPeriod.forEach(inst => {
        data.push({
          'Descrição': acc.description,
          'Categoria': acc.category,
          'Parcela': `${inst.installmentNumber}/${acc.installments.length}`,
          'Status': inst.status === 'paga' ? 'Paga' : 'Pendente',
          'Data': inst.status === 'paga' && inst.paidAt ? formatDateTimeCompact(inst.paidAt) : `Venc: ${formatDate(inst.dueDate)}`,
          'Valor': inst.amount
        });
        total += inst.amount;
      });
    });

    data.push({
      'Descrição': '',
      'Categoria': '',
      'Parcela': '',
      'Data Pagamento': 'TOTAL',
      'Valor': total
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contas Pagas');
    XLSX.writeFile(wb, `contas-pagas-${formatDate(start)}-${formatDate(end)}.xlsx`);
    
    toast.success('Excel gerado com sucesso!');
    setExportDialogOpen(false);
  };

  const resetForm = () => {
    setDescription('');
    setCategory('outros');
    setTotalAmount('');
    setInstallmentCount(1);
    setFirstDueDate('');
  };

  // Função para verificar se parcela está em atraso
  const isInstallmentOverdue = (dueDate: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = dueDate?.toDate ? dueDate.toDate() : new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Função para aplicar filtro rápido
  const applyQuickFilter = (account: AccountPayable) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingInstallments = account.installments.filter(inst => inst.status === 'pendente');
    if (pendingInstallments.length === 0) return false;

    if (quickFilter === 'all') return true;

    return pendingInstallments.some(inst => {
      const dueDate = (inst.dueDate as any)?.toDate ? (inst.dueDate as any).toDate() : inst.dueDate instanceof Date ? inst.dueDate : new Date();
      dueDate.setHours(0, 0, 0, 0);

      if (quickFilter === 'overdue') {
        return dueDate < today;
      } else if (quickFilter === 'today') {
        return dueDate.getTime() === today.getTime();
      } else if (quickFilter === 'next7days') {
        const next7 = new Date(today);
        next7.setDate(next7.getDate() + 7);
        return dueDate >= today && dueDate <= next7;
      }
      return false;
    });
  };

  const pendingAccounts = accounts.filter(a => a.status !== 'paga' && applyQuickFilter(a));
  const paidAccounts = accounts.filter(a => a.status === 'paga');

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-9 bg-white/10 rounded w-64 animate-pulse"></div>
            <div className="h-10 bg-white/10 rounded w-40 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="backdrop-blur-xl bg-white/5 border-white/10 p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded"></div>
                  <div className="h-4 bg-white/10 rounded"></div>
                  <div className="h-4 bg-white/10 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Contas a Pagar</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setExportDialogOpen(true)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar Contas
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setQuickFilter('all')}
            variant="outline"
            className={quickFilter === 'all' ? 'bg-blue-500/30 border-blue-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
          >
            <List className="w-4 h-4 mr-2" />
            Todas
          </Button>
          <Button
            onClick={() => setQuickFilter('overdue')}
            variant="outline"
            className={quickFilter === 'overdue' ? 'bg-red-500/30 border-red-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Vencidas
          </Button>
          <Button
            onClick={() => setQuickFilter('today')}
            variant="outline"
            className={quickFilter === 'today' ? 'bg-yellow-500/30 border-yellow-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
          >
            <Clock className="w-4 h-4 mr-2" />
            Vencendo Hoje
          </Button>
          <Button
            onClick={() => setQuickFilter('next7days')}
            variant="outline"
            className={quickFilter === 'next7days' ? 'bg-green-500/30 border-green-500/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Próximos 7 dias
          </Button>
        </div>

        {/* Contas Pendentes */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Pendentes</h2>
          {pendingAccounts.length === 0 ? (
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-8">
              <div className="text-center text-white/50">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conta pendente</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingAccounts.map((account) => (
                <Card key={account.id} className="backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{account.description}</h3>
                      <p className="text-sm text-white/50 capitalize">{account.category}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Total:</span>
                        <span className="text-white font-bold">{formatCurrency(account.totalAmount)}</span>
                      </div>

                      <div className="space-y-1">
                        {account.installments.map((inst) => {
                          return (
                          <div key={inst.installmentNumber} className={`flex items-center justify-between text-xs p-2 rounded ${
                            inst.status === 'pendente' && isInstallmentOverdue(inst.dueDate) 
                              ? 'bg-red-500/20 border border-red-500/30' 
                              : 'bg-white/5'
                          }`}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span className="text-white/70">
                                  Parcela {inst.installmentNumber}/{account.installments.length}
                                </span>
                                {inst.status === 'pendente' && isInstallmentOverdue(inst.dueDate) && (
                                  <span className="text-red-400 font-bold text-[10px] bg-red-500/20 px-1 rounded">
                                    ATRASADA
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] ${
                                inst.status === 'pendente' && isInstallmentOverdue(inst.dueDate)
                                  ? 'text-red-300 font-semibold'
                                  : 'text-white/50'
                              }`}>
                                Venc: {formatDate(inst.dueDate)}
                              </span>
                            </div>
                            <span className="text-white">{formatCurrency(inst.amount)}</span>
                            {inst.status === 'pendente' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsPaid(account.id, inst.installmentNumber)}
                                className="h-6 px-2 text-xs bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-green-400 text-xs font-semibold">✓ Paga</span>
                                <span className="text-white/70 text-[10px] font-medium mt-0.5">
                                  {inst.paidAt ? formatDateTimeCompact(inst.paidAt) : 'Data não registrada'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      className="w-full bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Conta
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contas Pagas */}
        {paidAccounts.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Pagas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paidAccounts.map((account) => (
                <Card key={account.id} className="backdrop-blur-xl bg-white/5 border-white/10 opacity-60">
                  <div className="p-6 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{account.description}</h3>
                      <p className="text-sm text-white/50 capitalize">{account.category}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-white/50">Total: </span>
                      <span className="text-white font-bold">{formatCurrency(account.totalAmount)}</span>
                    </div>

                    {/* Parcelas Pagas */}
                    <div className="space-y-2 border-t border-white/10 pt-3">
                      {account.installments.map((inst) => (
                        <div key={inst.installmentNumber} className="flex items-center justify-between text-sm">
                          <div className="flex flex-col">
                            <span className="text-white/70">
                              Parcela {inst.installmentNumber}/{account.installments.length}
                            </span>
                            <span className="text-white/50" style={{ fontSize: '10px' }}>
                              Venc: {formatDate(inst.dueDate)}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-white">{formatCurrency(inst.amount)}</span>
                            <span className="text-green-400 text-xs font-semibold">✓ Paga</span>
                            <span className="text-white/70 text-[10px] font-medium mt-0.5">
                              {inst.paidAt ? formatDateTimeCompact(inst.paidAt) : 'Data não registrada'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      className="w-full bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Conta
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Dialog de Criar Conta */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
  <DialogTitle className="text-2xl font-bold text-white">Nova Conta a Pagar</DialogTitle>
  <DialogDescription className="text-white/70">
    Preencha os dados para cadastrar uma nova conta a pagar.
  </DialogDescription>
</DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white">Descrição *</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Conta de Água - Janeiro"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agua">Água</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="energia">Energia</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="salario">Salário</SelectItem>
                    <SelectItem value="imposto">Imposto</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white">Valor Total *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Parcelas</Label>
                  <Select value={installmentCount.toString()} onValueChange={(v) => setInstallmentCount(parseInt(v))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Primeiro Vencimento *</Label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {processing ? 'Criando...' : 'Criar Conta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Exportar Contas Pagas */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
           <DialogHeader>
  <DialogTitle className="text-2xl font-bold text-white">Exportar Contas do Período</DialogTitle>
  <DialogDescription className="text-white/70">
    Defina o período e exporte o relatório das contas a pagar.
  </DialogDescription>
</DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white">Data Inicial *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Data Final *</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleExportPDF}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleExportExcel}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
