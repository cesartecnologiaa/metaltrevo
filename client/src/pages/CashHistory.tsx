import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cashService, CashRegister } from '@/services/cashService';
import { FileDown, Search, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateCashClosingReport } from '@/utils/cashReportPDF';
import { useCompanySettings } from '@/hooks/useCompanySettings';

export default function CashHistory() {
  const { settings } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [filteredRegisters, setFilteredRegisters] = useState<CashRegister[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResponsible, setSearchResponsible] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cashRegisters, startDate, endDate, searchResponsible]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const registers = await cashService.getClosedCashRegisters();
      setCashRegisters(registers);
    } catch (error) {
      console.error('Error loading cash history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cashRegisters];

    // Filtro por data
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(reg => {
        if (!reg.closedAt) return false;
        return reg.closedAt >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(reg => {
        if (!reg.closedAt) return false;
        return reg.closedAt <= end;
      });
    }

    // Filtro por responsável
    if (searchResponsible.trim()) {
      const search = searchResponsible.toLowerCase();
      filtered = filtered.filter(reg => 
        reg.openedByName.toLowerCase().includes(search) ||
        reg.closedByName?.toLowerCase().includes(search)
      );
    }

    setFilteredRegisters(filtered);
  };

  const handleGeneratePDF = async (cashRegister: CashRegister) => {
    try {
      setLoading(true);
      
      // Buscar sangrias e vendas daquele caixa
      const withdrawals = await cashService.getWithdrawals(cashRegister.id!);
      
      // Buscar vendas do período do caixa
      const allSales = await cashService.getTodaySales(); // Simplificado - você pode melhorar isso
      const cashSales = allSales.filter((sale: any) => {
        const saleDate = sale.createdAt;
        return saleDate >= cashRegister.openedAt && 
               (!cashRegister.closedAt || saleDate <= cashRegister.closedAt);
      });

      // Agrupar vendas por forma de pagamento
      const salesByPaymentMethod = cashSales.reduce((acc: any, sale: any) => {
        const method = sale.paymentMethod || 'Não informado';
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }
        acc[method].count++;
        acc[method].total += (sale as any).total || 0;
        return acc;
      }, {});

      const totalSales = cashSales.reduce((sum: number, sale: any) => sum + ((sale as any).total || 0), 0);
      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      const finalBalance = cashRegister.initialBalance + totalSales - totalWithdrawals;

      await generateCashClosingReport({
        cashRegister,
        salesByPaymentMethod,
        withdrawals,
        totalSales,
        totalWithdrawals,
        finalBalance,
        companySettings: settings,
      });

      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchResponsible('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Histórico de Caixas</h1>
            <p className="text-white/70">Consulte fechamentos anteriores e reimprima relatórios</p>
          </div>
          <Button onClick={loadHistory} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription className="text-white/70">
              Filtre por data ou responsável
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-white/90">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-white/90">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="searchResponsible" className="text-white/90">Responsável</Label>
                <Input
                  id="searchResponsible"
                  type="text"
                  placeholder="Nome do responsável"
                  value={searchResponsible}
                  onChange={(e) => setSearchResponsible(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Histórico */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Caixas Fechados ({filteredRegisters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-400" />
                <p className="text-white/70">Carregando histórico...</p>
              </div>
            ) : filteredRegisters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/70">Nenhum caixa fechado encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/90">Data de Fechamento</TableHead>
                      <TableHead className="text-white/90">Aberto por</TableHead>
                      <TableHead className="text-white/90">Fechado por</TableHead>
                      <TableHead className="text-white/90 text-right">Saldo Inicial</TableHead>
                      <TableHead className="text-white/90 text-right">Total Vendas</TableHead>
                      <TableHead className="text-white/90 text-right">Sangrias</TableHead>
                      <TableHead className="text-white/90 text-right">Saldo Final</TableHead>
                      <TableHead className="text-white/90 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegisters.map((register) => (
                      <TableRow key={register.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white">
                          {register.closedAt && format(register.closedAt, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-white/80">{register.openedByName}</TableCell>
                        <TableCell className="text-white/80">{register.closedByName}</TableCell>
                        <TableCell className="text-white text-right">
                          R$ {register.initialBalance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-green-400 text-right font-medium">
                          R$ {(register.totalSales || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-red-400 text-right font-medium">
                          R$ {(register.totalWithdrawals || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-white text-right font-bold">
                          R$ {(register.finalBalance || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            onClick={() => handleGeneratePDF(register)}
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                          >
                            <FileDown className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
