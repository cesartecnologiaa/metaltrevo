import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileDown, Search, Calendar, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { addPDFHeader, addPDFFooter } from '@/utils/pdfHeader';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { formatCurrency } from '@/lib/formatters';

type ReportType = 'sales' | 'products' | 'cashflow' | 'sellers' | 'accounts_paid';

export default function Reports() {
  const { settings } = useCompanySettings();
  const [loading, setLoading] = useState(false);

  // Helper para formatar datas com validação
  const formatDate = (date: any, formatStr: string): string => {
    if (!date) return '';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return isValid(dateObj) ? format(dateObj, formatStr) : '';
  };

  const normalizeReportProduct = (product: any) => {
    const currentStock = Number(product?.currentStock ?? product?.stock ?? 0);
    const minStock = Number(product?.minStock ?? product?.minimumStock ?? 0);
    const salePrice = Number(product?.salePrice ?? product?.cashPrice ?? product?.price ?? 0);
    const costPrice = Number(product?.costPrice ?? product?.purchasePrice ?? 0);

    return {
      ...product,
      currentStock,
      stock: currentStock,
      minStock,
      price: salePrice,
      salePrice,
      cashPrice: Number(product?.cashPrice ?? salePrice),
      creditPrice: Number(product?.creditPrice ?? salePrice),
      costPrice,
      purchasePrice: costPrice,
      category: product?.categoryName || product?.category || 'Sem categoria',
      categoryName: product?.categoryName || product?.category || 'Sem categoria',
    };
  };

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Funções de atalho de data
  const setToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
    setActiveShortcut('today');
  };

  const setThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek); // Domingo
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
    
    setStartDate(format(startOfWeek, 'yyyy-MM-dd'));
    setEndDate(format(endOfWeek, 'yyyy-MM-dd'));
    setActiveShortcut('week');
  };

  const setThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(format(startOfMonth, 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth, 'yyyy-MM-dd'));
    setActiveShortcut('month');
  };

  // Limpar atalho ativo quando usuário digita manualmente
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setActiveShortcut(null);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setActiveShortcut(null);
  };

  const generateReport = async () => {
    // Validar datas apenas para relatórios que precisam de período
    if (reportType !== 'products' && (!startDate || !endDate)) {
      toast.error('Selecione o período do relatório');
      return;
    }

    try {
      setLoading(true);
      // Corrigir interpretação de datas para usar timezone local
      // Adicionar 'T00:00:00' força interpretação como hora local, não UTC
      const start = startDate ? startOfDay(new Date(startDate + 'T00:00:00')) : new Date();
      const end = endDate ? endOfDay(new Date(endDate + 'T23:59:59')) : new Date();

      switch (reportType) {
        case 'sales':
          await generateSalesReport(start, end);
          break;
        case 'products':
          await generateProductsReport();
          break;
        case 'cashflow':
          await generateCashflowReport(start, end);
          break;
        case 'sellers':
          await generateSellersReport(start, end);
          break;
        case 'accounts_paid':
          await generateAccountsPaidReport(start, end);
          break;
      }

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const generateSalesReport = async (start: Date, end: Date) => {
    const salesQuery = query(
      collection(db, 'sales'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(salesQuery);
    const sales = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }))
      .filter((sale: any) => sale.status === 'concluida');

    const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
    const totalSales = sales.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Agrupar por forma de pagamento
    const byPaymentMethod: any = {};
    sales.forEach((sale: any) => {
      const method = sale.paymentMethod || 'Não informado';
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += (sale.total || 0);
    });

    setReportData(sales);
    setSummary({
      totalRevenue,
      totalSales,
      averageTicket,
      byPaymentMethod,
    });
  };

  const generateProductsReport = async () => {
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => normalizeReportProduct({
      id: doc.id,
      ...doc.data(),
    }));

    const totalProducts = products.length;
    const lowStockProducts = products.filter((p: any) => Number(p.currentStock || 0) <= Number(p.minStock || 0)).length;
    const totalStockValue = products.reduce((sum: number, p: any) => {
      return sum + (Number(p.currentStock || 0) * Number(p.salePrice || p.cashPrice || p.price || 0));
    }, 0);

    setReportData(products);
    setSummary({
      totalProducts,
      lowStockProducts,
      totalStockValue,
    });
  };

  const generateCashflowReport = async (start: Date, end: Date) => {
    // Buscar caixas fechados no período
    const cashQuery = query(
      collection(db, 'cashRegisters'),
      where('closedAt', '>=', Timestamp.fromDate(start)),
      where('closedAt', '<=', Timestamp.fromDate(end)),
      where('status', '==', 'closed')
    );

    const snapshot = await getDocs(cashQuery);
    const cashRegisters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      openedAt: doc.data().openedAt.toDate(),
      closedAt: doc.data().closedAt?.toDate(),
    }));

    const totalRevenue = cashRegisters.reduce((sum: number, cash: any) => sum + (cash.totalSales || 0), 0);
    const totalWithdrawals = cashRegisters.reduce((sum: number, cash: any) => sum + (cash.totalWithdrawals || 0), 0);
    const netCashflow = totalRevenue - totalWithdrawals;

    setReportData(cashRegisters);
    setSummary({
      totalRevenue,
      totalWithdrawals,
      netCashflow,
      cashRegistersCount: cashRegisters.length,
    });
  };

  const generateSellersReport = async (start: Date, end: Date) => {
    const salesQuery = query(
      collection(db, 'sales'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(salesQuery);
    const sales = snapshot.docs
      .map(doc => doc.data())
      .filter((sale: any) => sale.status === 'concluida');

    const sellerStats: any = {};
    sales.forEach((sale: any) => {
      const sellerName = sale.sellerName || 'Não informado';
      if (!sellerStats[sellerName]) {
        sellerStats[sellerName] = {
          name: sellerName,
          sales: 0,
          revenue: 0,
        };
      }
      sellerStats[sellerName].sales++;
      sellerStats[sellerName].revenue += (sale.total || 0);
    });

    const sellersArray = Object.values(sellerStats).sort((a: any, b: any) => b.revenue - a.revenue);

    setReportData(sellersArray);
    setSummary({
      totalSellers: sellersArray.length,
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0),
    });
  };

  const generateAccountsPaidReport = async (start: Date, end: Date) => {
    const accountsSnapshot = await getDocs(collection(db, 'accountsPayable'));
    const accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    const paidAccounts: any[] = [];
    let totalPaid = 0;

    accounts.forEach(acc => {
      acc.installments?.forEach((inst: any) => {
        if (inst.status === 'paga' && inst.paidAt) {
          const paidDate = inst.paidAt instanceof Date ? inst.paidAt : inst.paidAt.toDate();
          if (paidDate >= start && paidDate <= end) {
            paidAccounts.push({
              description: acc.description,
              category: acc.category,
              installment: `${inst.installmentNumber}/${acc.installments.length}`,
              paidAt: paidDate,
              amount: inst.amount,
              paidByName: inst.paidByName || 'Não informado'
            });
            totalPaid += inst.amount;
          }
        }
      });
    });

    setReportData(paidAccounts);
    setSummary({
      totalAccounts: paidAccounts.length,
      totalPaid,
    });
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const reportTitles: Record<ReportType, string> = {
      sales: 'Relatório de Vendas',
      products: 'Relatório de Produtos',
      cashflow: 'Relatório de Fluxo de Caixa',
      sellers: 'Relatório de Vendedores',
      accounts_paid: 'Relatório de Contas Pagas',
    };

    const subtitle = (startDate && endDate) 
      ? `Período: ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(new Date(endDate), 'dd/MM/yyyy')}`
      : undefined;

    // Adicionar cabeçalho padrão
    let yPos = await addPDFHeader(doc, settings, reportTitles[reportType], subtitle);

    // Resumo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO', 15, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (reportType === 'sales') {
      doc.text(`Total de Vendas: ${summary.totalSales}`, 15, yPos);
      yPos += 5;
      doc.text(`Faturamento Total: ${formatCurrency(summary.totalRevenue || 0)}`, 15, yPos);
      yPos += 5;
      doc.text(`Ticket Médio: ${formatCurrency(summary.averageTicket || 0)}`, 15, yPos);
      yPos += 10;
    } else if (reportType === 'products') {
      doc.text(`Total de Produtos: ${summary.totalProducts}`, 15, yPos);
      yPos += 5;
      doc.text(`Produtos com Estoque Baixo: ${summary.lowStockProducts}`, 15, yPos);
      yPos += 5;
      doc.text(`Valor Total em Estoque: ${formatCurrency(summary.totalStockValue || 0)}`, 15, yPos);
      yPos += 10;
    } else if (reportType === 'cashflow') {
      doc.text(`Total de Caixas: ${summary.cashRegistersCount}`, 15, yPos);
      yPos += 5;
      doc.text(`Receita Total: ${formatCurrency(summary.totalRevenue || 0)}`, 15, yPos);
      yPos += 5;
      doc.text(`Sangrias: ${formatCurrency(summary.totalWithdrawals || 0)}`, 15, yPos);
      yPos += 5;
      doc.text(`Fluxo Líquido: ${formatCurrency(summary.netCashflow || 0)}`, 15, yPos);
      yPos += 10;
    } else if (reportType === 'sellers') {
      doc.text(`Total de Vendedores: ${summary.totalSellers}`, 15, yPos);
      yPos += 5;
      doc.text(`Total de Vendas: ${summary.totalSales}`, 15, yPos);
      yPos += 5;
      doc.text(`Faturamento Total: ${formatCurrency(summary.totalRevenue || 0)}`, 15, yPos);
      yPos += 10;
    } else if (reportType === 'accounts_paid') {
      doc.text(`Total de Contas: ${summary.totalAccounts}`, 15, yPos);
      yPos += 5;
      doc.text(`Total Pago: ${formatCurrency(summary.totalPaid || 0)}`, 15, yPos);
      yPos += 10;
    }

    // Tabelas detalhadas
    if (reportType === 'sales') {
      const tableData = reportData.map((sale: any) => [
        formatDate(sale.createdAt, 'dd/MM/yyyy HH:mm'),
        `#${sale.saleNumber}`,
        sale.clientName || 'Não informado',
        sale.items?.map((item: any) => `${item.productName} (x${item.quantity})`).join(', ') || '',
        sale.paymentMethod === 'dinheiro' ? 'Dinheiro' :
        sale.paymentMethod === 'cartao_credito' ? 'Cartão Créd.' :
        sale.paymentMethod === 'cartao_debito' ? 'Cartão Déb.' :
        sale.paymentMethod === 'pix' ? 'PIX' : 'Boleto',
        formatCurrency(sale.total || 0),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Nº Venda', 'Cliente', 'Produtos', 'Pagamento', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 30 },
          3: { cellWidth: 60 },
          4: { cellWidth: 25 },
          5: { cellWidth: 'auto', halign: 'right' },
        },
      });
    } else if (reportType === 'sellers') {
      const tableData = reportData.map((seller: any, index: number) => [
        `${index + 1}º`,
        seller.name,
        seller.sales.toString(),
        formatCurrency(seller.revenue || 0),
        formatCurrency((seller.revenue / seller.sales) || 0),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Pos.', 'Vendedor', 'Qtd. Vendas', 'Faturamento', 'Ticket Médio']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
        },
      });
    } else if (reportType === 'products') {
      const tableData = reportData.map((product: any) => [
        String(product.code || ''),
        String(product.name || ''),
        String(product.categoryName || product.category || 'Sem categoria'),
        Number(product.currentStock || 0).toString(),
        Number(product.minStock || 0).toString(),
        formatCurrency(Number(product.salePrice || product.cashPrice || product.price || 0)),
        formatCurrency(Number(product.currentStock || 0) * Number(product.salePrice || product.cashPrice || product.price || 0)),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Código', 'Produto', 'Categoria', 'Estoque', 'Mín.', 'Preço', 'Valor Estoque']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 30, halign: 'right' },
        },
      });
    } else if (reportType === 'cashflow') {
      const tableData = reportData.map((cash: any) => [
        formatDate(cash.openedAt, 'dd/MM/yyyy HH:mm'),
        cash.closedAt ? formatDate(cash.closedAt, 'dd/MM/yyyy HH:mm') : '-',
        cash.openedByName,
        formatCurrency(cash.initialBalance || 0),
        formatCurrency(cash.totalSales || 0),
        formatCurrency(cash.totalWithdrawals || 0),
        formatCurrency(cash.finalBalance || 0),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Abertura', 'Fechamento', 'Operador', 'Saldo Inicial', 'Vendas', 'Sangrias', 'Saldo Final']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 28 },
          2: { cellWidth: 'auto' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
        },
      });
    } else if (reportType === 'accounts_paid') {
      const tableData = reportData.map((account: any) => [
        formatDate(account.paidAt, 'dd/MM/yyyy HH:mm'),
        account.description,
        account.category,
        account.installment,
        account.paidByName,
        formatCurrency(account.amount || 0),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Data Pagamento', 'Descrição', 'Categoria', 'Parcela', 'Pago Por', 'Valor']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30 },
          5: { halign: 'right' },
        },
      });
    }

    // Rodapé
    addPDFFooter(doc);

    doc.save(`relatorio-${reportType}-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportToExcel = () => {
    let worksheetData: any[] = [];

    if (reportType === 'sales') {
      worksheetData = reportData.map((sale: any) => ({
        Data: formatDate(sale.createdAt, 'dd/MM/yyyy HH:mm'),
        Cliente: sale.clientName || 'N/A',
        'Forma Pagamento': sale.paymentMethod || 'N/A',
        Total: sale.total || 0,
        Vendedor: sale.createdByName || 'N/A',
      }));
    } else if (reportType === 'products') {
      worksheetData = reportData.map((product: any) => ({
        Código: product.code || 'N/A',
        Nome: product.name || 'N/A',
        Categoria: product.categoryName || product.category || 'N/A',
        'Estoque Atual': Number(product.currentStock || 0),
        'Estoque Mínimo': Number(product.minStock || 0),
        'Preço Venda': Number(product.salePrice || product.cashPrice || product.price || 0),
        'Valor em Estoque': Number(product.currentStock || 0) * Number(product.salePrice || product.cashPrice || product.price || 0),
      }));
    } else if (reportType === 'cashflow') {
      worksheetData = reportData.map((cash: any) => ({
        'Data Fechamento': cash.closedAt ? formatDate(cash.closedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
        'Aberto por': cash.openedByName || 'N/A',
        'Fechado por': cash.closedByName || 'N/A',
        'Saldo Inicial': cash.initialBalance || 0,
        'Total Vendas': cash.totalSales || 0,
        Sangrias: cash.totalWithdrawals || 0,
        'Saldo Final': cash.finalBalance || 0,
      }));
    } else if (reportType === 'sellers') {
      worksheetData = reportData.map((seller: any) => ({
        Vendedor: seller.name,
        'Total Vendas': seller.sales,
        Faturamento: seller.revenue,
        'Ticket Médio': seller.sales > 0 ? (seller.revenue / seller.sales).toFixed(2) : 0,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, `relatorio-${reportType}-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  const reportTitles: any = {
    sales: 'Relatório de Vendas',
    products: 'Relatório de Produtos',
    cashflow: 'Relatório de Fluxo de Caixa',
    sellers: 'Relatório de Desempenho de Vendedores',
    accounts_paid: 'Relatório de Contas Pagas',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-white/70">Gere relatórios detalhados do seu negócio</p>
        </div>

        {/* Filtros */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Configurar Relatório
            </CardTitle>
            <CardDescription className="text-white/70">
              Selecione o tipo e período do relatório
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Atalhos de Data */}
            {reportType !== 'products' && (
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={setToday}
                  variant="outline"
                  size="sm"
                  className={`${
                    activeShortcut === 'today'
                      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Hoje
                </Button>
                <Button
                  onClick={setThisWeek}
                  variant="outline"
                  size="sm"
                  className={`${
                    activeShortcut === 'week'
                      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Esta Semana
                </Button>
                <Button
                  onClick={setThisMonth}
                  variant="outline"
                  size="sm"
                  className={`${
                    activeShortcut === 'month'
                      ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Este Mês
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="reportType" className="text-white/90">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="sales" className="text-white">Vendas</SelectItem>
                    <SelectItem value="products" className="text-white">Produtos</SelectItem>
                    <SelectItem value="cashflow" className="text-white">Fluxo de Caixa</SelectItem>
                    <SelectItem value="sellers" className="text-white">Vendedores</SelectItem>
                    <SelectItem value="accounts_paid" className="text-white">Contas Pagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reportType !== 'products' && (
                <>
                  <div>
                    <Label htmlFor="startDate" className="text-white/90">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-white/90">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </>
              )}
              <div className="flex items-end">
                <Button onClick={generateReport} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Gerar Relatório
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {reportData.length > 0 && (
          <>
            {/* Resumo */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">{reportTitles[reportType]}</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={exportToPDF} variant="outline" size="sm" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                      <FileDown className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button onClick={exportToExcel} variant="outline" size="sm" className="border-green-500 text-green-400 hover:bg-green-500/10">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {reportType === 'sales' && (
                    <>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Total de Vendas</p>
                        <p className="text-2xl font-bold text-white">{summary.totalSales}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Faturamento Total</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {summary.totalRevenue?.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Ticket Médio</p>
                        <p className="text-2xl font-bold text-white">
                          R$ {summary.averageTicket?.toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                  {reportType === 'products' && (
                    <>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Total de Produtos</p>
                        <p className="text-2xl font-bold text-white">{summary.totalProducts}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Estoque Baixo</p>
                        <p className="text-2xl font-bold text-orange-400">{summary.lowStockProducts}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Valor em Estoque</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {formatCurrency(summary.totalStockValue || 0)}
                        </p>
                      </div>
                    </>
                  )}
                  {reportType === 'cashflow' && (
                    <>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Receita Total</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {summary.totalRevenue?.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Sangrias</p>
                        <p className="text-2xl font-bold text-red-400">
                          R$ {summary.totalWithdrawals?.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Fluxo Líquido</p>
                        <p className="text-2xl font-bold text-white">
                          R$ {summary.netCashflow?.toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                  {reportType === 'sellers' && (
                    <>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Vendedores Ativos</p>
                        <p className="text-2xl font-bold text-white">{summary.totalSellers}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Total de Vendas</p>
                        <p className="text-2xl font-bold text-white">{summary.totalSales}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded">
                        <p className="text-white/70 text-sm">Faturamento Total</p>
                        <p className="text-2xl font-bold text-green-400">
                          R$ {summary.totalRevenue?.toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Tabela de Dados */}
                <div className="overflow-x-auto">
                  <p className="text-white/70 text-sm mb-2">
                    Total de registros: {reportData.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabela Detalhada */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-6">
                {reportType === 'sales' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white">Data</TableHead>
                          <TableHead className="text-white">Nº Venda</TableHead>
                          <TableHead className="text-white">Cliente</TableHead>
                          <TableHead className="text-white">Produtos</TableHead>
                          <TableHead className="text-white">Pagamento</TableHead>
                          <TableHead className="text-white text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((sale: any) => (
                          <TableRow key={sale.id} className="border-white/10">
                            <TableCell className="text-white/90">
                              {formatDate(sale.createdAt, 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-white/90 font-mono">#{sale.saleNumber}</TableCell>
                            <TableCell className="text-white/90">{sale.clientName || 'Não informado'}</TableCell>
                            <TableCell className="text-white/70 text-sm">
                              {sale.items?.map((item: any, idx: number) => (
                                <div key={idx}>
                                  {item.productName} (x{item.quantity})
                                </div>
                              ))}
                            </TableCell>
                            <TableCell className="text-white/70">
                              {sale.paymentMethod === 'dinheiro' && 'Dinheiro'}
                              {sale.paymentMethod === 'cartao_credito' && 'Cartão Crédito'}
                              {sale.paymentMethod === 'cartao_debito' && 'Cartão Débito'}
                              {sale.paymentMethod === 'pix' && 'PIX'}
                              {sale.paymentMethod === 'boleto' && 'Boleto'}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold text-right">
                              R$ {sale.total?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {reportType === 'sellers' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white">Posição</TableHead>
                          <TableHead className="text-white">Vendedor</TableHead>
                          <TableHead className="text-white text-center">Qtd. Vendas</TableHead>
                          <TableHead className="text-white text-right">Faturamento</TableHead>
                          <TableHead className="text-white text-right">Ticket Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((seller: any, index: number) => (
                          <TableRow key={index} className="border-white/10">
                            <TableCell className="text-white/90 font-bold">
                              {index + 1}º
                            </TableCell>
                            <TableCell className="text-white/90 font-semibold">{seller.name}</TableCell>
                            <TableCell className="text-white/90 text-center">{seller.sales}</TableCell>
                            <TableCell className="text-green-400 font-bold text-right">
                              R$ {seller.revenue?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-white/90 text-right">
                              R$ {(seller.revenue / seller.sales)?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {reportType === 'products' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white">Código</TableHead>
                          <TableHead className="text-white">Produto</TableHead>
                          <TableHead className="text-white">Categoria</TableHead>
                          <TableHead className="text-white text-center">Estoque</TableHead>
                          <TableHead className="text-white text-center">Mín.</TableHead>
                          <TableHead className="text-white text-right">Preço</TableHead>
                          <TableHead className="text-white text-right">Valor Estoque</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((product: any) => (
                          <TableRow key={product.id} className="border-white/10">
                            <TableCell className="text-white/90 font-mono">{product.code}</TableCell>
                            <TableCell className="text-white/90">{product.name}</TableCell>
                            <TableCell className="text-white/70">{product.categoryName || product.category || 'Sem categoria'}</TableCell>
                            <TableCell className={`text-center font-semibold ${
                              (product.currentStock || 0) <= (product.minStock || 0) 
                                ? 'text-red-400' 
                                : 'text-white/90'
                            }`}>
                              {Number(product.currentStock || 0)}
                            </TableCell>
                            <TableCell className="text-white/70 text-center">{Number(product.minStock || 0)}</TableCell>
                            <TableCell className="text-white/90 text-right">
                              R$ {formatCurrency(Number(product.salePrice || product.cashPrice || product.price || 0))}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold text-right">
                              R$ {formatCurrency(Number(product.currentStock || 0) * Number(product.salePrice || product.cashPrice || product.price || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {reportType === 'cashflow' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white">Abertura</TableHead>
                          <TableHead className="text-white">Fechamento</TableHead>
                          <TableHead className="text-white">Operador</TableHead>
                          <TableHead className="text-white text-right">Saldo Inicial</TableHead>
                          <TableHead className="text-white text-right">Vendas</TableHead>
                          <TableHead className="text-white text-right">Sangrias</TableHead>
                          <TableHead className="text-white text-right">Saldo Final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((cash: any) => (
                          <TableRow key={cash.id} className="border-white/10">
                            <TableCell className="text-white/90">
                              {formatDate(cash.openedAt, 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-white/90">
                              {cash.closedAt ? formatDate(cash.closedAt, 'dd/MM/yyyy HH:mm') : '-'}
                            </TableCell>
                            <TableCell className="text-white/90">{cash.openedByName}</TableCell>
                            <TableCell className="text-white/90 text-right">
                              R$ {cash.initialBalance?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-green-400 text-right">
                              R$ {cash.totalSales?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-red-400 text-right">
                              R$ {cash.totalWithdrawals?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-white font-bold text-right">
                              R$ {cash.finalBalance?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {reportType === 'accounts_paid' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white">Data Pagamento</TableHead>
                          <TableHead className="text-white">Descrição</TableHead>
                          <TableHead className="text-white">Categoria</TableHead>
                          <TableHead className="text-white">Parcela</TableHead>
                          <TableHead className="text-white">Pago Por</TableHead>
                          <TableHead className="text-white text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((account: any, index: number) => (
                          <TableRow key={index} className="border-white/10">
                            <TableCell className="text-white/90">
                              {formatDate(account.paidAt, 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-white/90">{account.description}</TableCell>
                            <TableCell className="text-white/70">{account.category}</TableCell>
                            <TableCell className="text-white/70">{account.installment}</TableCell>
                            <TableCell className="text-white/70">{account.paidByName}</TableCell>
                            <TableCell className="text-green-400 font-bold text-right">
                              R$ {account.amount?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {reportData.length === 0 && !loading && (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <p className="text-white/70">Selecione os filtros e clique em "Gerar Relatório"</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
