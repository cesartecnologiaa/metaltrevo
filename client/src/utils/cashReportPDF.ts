import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { CashRegister, CashWithdrawal } from '@/services/cashService';
import { addPDFHeader, addPDFFooter, CompanySettings } from '@/utils/pdfHeader';

interface SalesByPaymentMethod {
  [key: string]: {
    count: number;
    total: number;
  };
}

interface CashReportData {
  cashRegister: CashRegister;
  salesByPaymentMethod: SalesByPaymentMethod;
  withdrawals: CashWithdrawal[];
  totalSales: number;
  totalWithdrawals: number;
  finalBalance: number;
  companySettings: CompanySettings;
}

export async function generateCashClosingReport(data: CashReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Configurações
  const leftMargin = 15;
  const rightMargin = pageWidth - 15;
  const lineHeight = 7;
  
  // Adicionar cabeçalho padrão
  let yPos = await addPDFHeader(
    doc,
    data.companySettings,
    'RELATÓRIO DE FECHAMENTO DE CAIXA',
    `Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
  );

  // Função auxiliar para adicionar linha
  const addLine = (text: string, x: number = leftMargin, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.text(text, x, yPos);
    yPos += lineHeight;
  };

  // Função auxiliar para adicionar linha com valor à direita
  const addLineWithValue = (label: string, value: string, bold: boolean = false) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, leftMargin, yPos);
    doc.text(value, rightMargin, yPos, { align: 'right' });
    yPos += lineHeight;
  };

  // Informações do Caixa
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 5;

  addLine('INFORMAÇÕES DO CAIXA', leftMargin, 12, 'bold');
  yPos += 2;

  addLineWithValue('Aberto em:', format(data.cashRegister.openedAt, 'dd/MM/yyyy HH:mm'));
  addLineWithValue('Aberto por:', data.cashRegister.openedByName);
  
  if (data.cashRegister.closedAt) {
    addLineWithValue('Fechado em:', format(data.cashRegister.closedAt, 'dd/MM/yyyy HH:mm'));
    addLineWithValue('Fechado por:', data.cashRegister.closedByName || '');
  }

  yPos += 3;
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 8;

  // Resumo Financeiro
  addLine('RESUMO FINANCEIRO', leftMargin, 12, 'bold');
  yPos += 2;

  addLineWithValue('Saldo Inicial:', `R$ ${data.cashRegister.initialBalance.toFixed(2)}`);
  addLineWithValue('Total de Vendas:', `R$ ${data.totalSales.toFixed(2)}`, true);
  addLineWithValue('Total de Sangrias:', `R$ ${data.totalWithdrawals.toFixed(2)}`);
  
  yPos += 2;
  doc.setDrawColor(0, 0, 0);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 5;
  
  addLineWithValue('SALDO FINAL:', `R$ ${data.finalBalance.toFixed(2)}`, true);

  yPos += 3;
  doc.setDrawColor(139, 92, 246);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 8;

  // Vendas por Forma de Pagamento
  addLine('VENDAS POR FORMA DE PAGAMENTO', leftMargin, 12, 'bold');
  yPos += 2;

  const paymentMethods = Object.entries(data.salesByPaymentMethod);
  
  if (paymentMethods.length > 0) {
    paymentMethods.forEach(([method, methodData]) => {
      addLineWithValue(
        `${method} (${methodData.count} ${methodData.count === 1 ? 'venda' : 'vendas'})`,
        `R$ ${methodData.total.toFixed(2)}`
      );
    });
  } else {
    addLine('Nenhuma venda registrada', leftMargin, 10, 'normal');
  }

  yPos += 3;
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 8;

  // Sangrias
  if (data.withdrawals.length > 0) {
    addLine('SANGRIAS REALIZADAS', leftMargin, 12, 'bold');
    yPos += 2;

    data.withdrawals.forEach((withdrawal) => {
      // Verificar se precisa de nova página
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${format(withdrawal.createdAt, 'dd/MM HH:mm')} - ${withdrawal.reason}`, leftMargin, yPos);
      doc.text(`R$ ${withdrawal.amount.toFixed(2)}`, rightMargin, yPos, { align: 'right' });
      yPos += lineHeight;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Por: ${withdrawal.createdByName}`, leftMargin + 5, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += lineHeight + 2;
    });

    yPos += 3;
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 8;
  }

  // Assinatura
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;
  addLine('ASSINATURAS', leftMargin, 12, 'bold');
  yPos += 15;

  // Linha de assinatura do responsável
  doc.setLineWidth(0.3);
  doc.line(leftMargin, yPos, pageWidth / 2 - 10, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.text('Responsável pelo Fechamento', leftMargin, yPos);

  // Linha de assinatura do gerente
  yPos -= 5;
  doc.line(pageWidth / 2 + 10, yPos, rightMargin, yPos);
  yPos += 5;
  doc.text('Gerente/Supervisor', pageWidth / 2 + 10, yPos);

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  const fileName = `fechamento-caixa-${format(data.cashRegister.openedAt, 'dd-MM-yyyy-HHmm')}.pdf`;
  doc.save(fileName);
}
