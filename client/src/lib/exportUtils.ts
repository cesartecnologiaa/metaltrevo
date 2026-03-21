import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Sale, Product } from '@/types';
import { format } from 'date-fns';

/**
 * Exportar relatório de vendas em PDF
 */
export function exportSalesToPDF(
  sales: Sale[],
  startDate?: string,
  endDate?: string
) {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Vendas', 14, 20);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Metal Trevo - Sistema de Gestão Comercial', 14, 28);
  
  // Período
  if (startDate || endDate) {
    const periodText = `Período: ${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Início'} até ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Hoje'}`;
    doc.text(periodText, 14, 35);
  }
  
  // Data de geração
  doc.setFontSize(9);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);
  
  // Preparar dados da tabela
  const tableData = sales.map(sale => {
    const saleDate = (sale.createdAt as any).toDate ? 
      (sale.createdAt as any).toDate() : 
      new Date(sale.createdAt as any);
    
    return [
      sale.saleNumber.toString(),
      format(saleDate, 'dd/MM/yyyy HH:mm'),
      sale.sellerName,
      sale.items.length.toString(),
      `R$ ${sale.total.toFixed(2)}`,
      sale.paymentMethod.toUpperCase(),
      sale.status === 'concluida' ? 'Concluída' : 'Cancelada'
    ];
  });
  
  // Calcular totais
  const totalSales = sales.filter(s => s.status === 'concluida').length;
  const totalCancelled = sales.filter(s => s.status === 'cancelada').length;
  const totalRevenue = sales
    .filter(s => s.status === 'concluida')
    .reduce((sum, sale) => sum + sale.total, 0);
  
  // Tabela
  autoTable(doc, {
    startY: 48,
    head: [['Nº Venda', 'Data/Hora', 'Vendedor', 'Itens', 'Total', 'Pagamento', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234], // purple-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 15 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    },
    didDrawPage: (data) => {
      // Rodapé em cada página
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });
  
  // Resumo no final
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total de vendas concluídas: ${totalSales}`, 14, finalY + 7);
  doc.text(`Total de vendas canceladas: ${totalCancelled}`, 14, finalY + 14);
  doc.text(`Faturamento total: R$ ${totalRevenue.toFixed(2)}`, 14, finalY + 21);
  
  // Salvar
  const fileName = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
  doc.save(fileName);
}

/**
 * Exportar relatório de vendas em Excel
 */
export function exportSalesToExcel(
  sales: Sale[],
  startDate?: string,
  endDate?: string
) {
  // Preparar dados
  const data = sales.map(sale => {
    const saleDate = (sale.createdAt as any).toDate ? 
      (sale.createdAt as any).toDate() : 
      new Date(sale.createdAt as any);
    
    return {
      'Nº Venda': sale.saleNumber,
      'Data': format(saleDate, 'dd/MM/yyyy'),
      'Hora': format(saleDate, 'HH:mm:ss'),
      'Vendedor': sale.sellerName,
      'Cliente': sale.clientName || 'Não informado',
      'Qtd Itens': sale.items.length,
      'Subtotal': sale.subtotal,
      'Desconto': sale.discount || 0,
      'Total': sale.total,
      'Pagamento': sale.paymentMethod.toUpperCase(),
      'Status': sale.status === 'concluida' ? 'Concluída' : 'Cancelada',
      'Motivo Cancelamento': sale.cancellation?.reason || ''
    };
  });
  
  // Criar planilha
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 10 }, // Nº Venda
    { wch: 12 }, // Data
    { wch: 10 }, // Hora
    { wch: 25 }, // Vendedor
    { wch: 25 }, // Cliente
    { wch: 10 }, // Qtd Itens
    { wch: 12 }, // Subtotal
    { wch: 10 }, // Desconto
    { wch: 12 }, // Total
    { wch: 12 }, // Pagamento
    { wch: 12 }, // Status
    { wch: 30 }  // Motivo Cancelamento
  ];
  worksheet['!cols'] = columnWidths;
  
  // Adicionar resumo
  const totalSales = sales.filter(s => s.status === 'concluida').length;
  const totalCancelled = sales.filter(s => s.status === 'cancelada').length;
  const totalRevenue = sales
    .filter(s => s.status === 'concluida')
    .reduce((sum, sale) => sum + sale.total, 0);
  
  const summaryData = [
    {},
    { 'Nº Venda': 'RESUMO' },
    { 'Nº Venda': 'Vendas Concluídas:', 'Data': totalSales },
    { 'Nº Venda': 'Vendas Canceladas:', 'Data': totalCancelled },
    { 'Nº Venda': 'Faturamento Total:', 'Data': totalRevenue }
  ];
  
  XLSX.utils.sheet_add_json(worksheet, summaryData, {
    skipHeader: true,
    origin: -1
  });
  
  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
  
  // Salvar
  const fileName = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exportar relatório de produtos em PDF
 */
export function exportProductsToPDF(products: Product[]) {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Produtos', 14, 20);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Metal Trevo - Sistema de Gestão Comercial', 14, 28);
  
  // Data de geração
  doc.setFontSize(9);
  doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 35);
  
  // Preparar dados da tabela
  const tableData = products.map(product => {
    const stockStatus = product.currentStock <= product.minStock ? 'BAIXO' : 'OK';
    const marginPercent = ((product.price - product.costPrice) / product.costPrice * 100).toFixed(1);
    
    return [
      product.code,
      product.name,
      product.categoryName || 'Sem categoria',
      product.currentStock.toString(),
      product.minStock.toString(),
      stockStatus,
      `R$ ${product.costPrice.toFixed(2)}`,
      `R$ ${product.price.toFixed(2)}`,
      `${marginPercent}%`,
      product.active ? 'Ativo' : 'Inativo'
    ];
  });
  
  // Tabela
  autoTable(doc, {
    startY: 42,
    head: [['Código', 'Produto', 'Categoria', 'Estoque', 'Mín', 'Status', 'Custo', 'Venda', 'Margem', 'Situação']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 12 },
      5: { cellWidth: 15 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18 },
      8: { cellWidth: 15 },
      9: { cellWidth: 15 }
    },
    didDrawCell: (data) => {
      // Destacar produtos com estoque baixo
      if (data.column.index === 5 && data.cell.text[0] === 'BAIXO') {
        doc.setFillColor(239, 68, 68); // red-500
      }
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });
  
  // Resumo
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalProducts = products.filter(p => p.active).length;
  const lowStockProducts = products.filter(p => p.active && p.currentStock <= p.minStock).length;
  const totalStockValue = products
    .filter(p => p.active)
    .reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total de produtos ativos: ${totalProducts}`, 14, finalY + 7);
  doc.text(`Produtos com estoque baixo: ${lowStockProducts}`, 14, finalY + 14);
  doc.text(`Valor total em estoque: R$ ${totalStockValue.toFixed(2)}`, 14, finalY + 21);
  
  // Salvar
  const fileName = `relatorio-produtos-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
  doc.save(fileName);
}

/**
 * Exportar relatório de estoque em Excel
 */
export function exportStockToExcel(products: Product[]) {
  // Preparar dados
  const data = products.map(product => {
    const stockStatus = product.currentStock <= product.minStock ? 'BAIXO' : 'OK';
    const marginPercent = ((product.price - product.costPrice) / product.costPrice * 100).toFixed(2);
    const stockValue = product.currentStock * product.costPrice;
    
    return {
      'Código': product.code,
      'Produto': product.name,
      'Categoria': product.categoryName || 'Sem categoria',
      'Fornecedor': product.supplierName || 'Não informado',
      'Estoque Atual': product.currentStock,
      'Estoque Mínimo': product.minStock,
      'Status Estoque': stockStatus,
      'Preço Custo': product.costPrice,
      'Preço Venda': product.price,
      'Margem %': parseFloat(marginPercent),
      'Valor em Estoque': stockValue,
      'Situação': product.active ? 'Ativo' : 'Inativo'
    };
  });
  
  // Criar planilha
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 15 }, // Código
    { wch: 35 }, // Produto
    { wch: 20 }, // Categoria
    { wch: 25 }, // Fornecedor
    { wch: 12 }, // Estoque Atual
    { wch: 12 }, // Estoque Mínimo
    { wch: 15 }, // Status Estoque
    { wch: 12 }, // Preço Custo
    { wch: 12 }, // Preço Venda
    { wch: 10 }, // Margem %
    { wch: 15 }, // Valor em Estoque
    { wch: 10 }  // Situação
  ];
  worksheet['!cols'] = columnWidths;
  
  // Adicionar resumo
  const totalProducts = products.filter(p => p.active).length;
  const lowStockProducts = products.filter(p => p.active && p.currentStock <= p.minStock).length;
  const totalStockValue = products
    .filter(p => p.active)
    .reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  
  const summaryData = [
    {},
    { 'Código': 'RESUMO' },
    { 'Código': 'Total de Produtos Ativos:', 'Produto': totalProducts },
    { 'Código': 'Produtos com Estoque Baixo:', 'Produto': lowStockProducts },
    { 'Código': 'Valor Total em Estoque:', 'Produto': totalStockValue }
  ];
  
  XLSX.utils.sheet_add_json(worksheet, summaryData, {
    skipHeader: true,
    origin: -1
  });
  
  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');
  
  // Salvar
  const fileName = `relatorio-estoque-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
