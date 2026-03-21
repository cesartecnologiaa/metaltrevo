import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { addPDFHeader, addPDFFooter, CompanySettings } from '@/utils/pdfHeader';

interface DeliveryItem {
  saleId: string;
  saleNumber: string;
  createdAt: Date;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  products: Array<{
    name: string;
    quantity: number;
    code?: string;
  }>;
  total: number;
  observations?: string;
}

export const generateDeliveryListPDF = async (deliveries: DeliveryItem[], companySettings: CompanySettings, userRole?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 4.5;

  // Adicionar cabeçalho padrão
  let yPos = await addPDFHeader(
    doc,
    companySettings,
    'LISTA DE ENTREGAS',
    `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
  );

  // Resumo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de Entregas: ${deliveries.length}`, margin, yPos);
  yPos += 7;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Listar cada entrega
  deliveries.forEach((delivery, index) => {
    // Verificar se precisa de nova página
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    // Número da entrega
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}. VENDA #${delivery.saleNumber}`, margin + 2, yPos);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${format(delivery.createdAt, 'dd/MM/yyyy HH:mm')}`, pageWidth - margin - 40, yPos);
    yPos += 7;

    // Cliente
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Cliente:', margin + 5, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(delivery.customerName, margin + 25, yPos);
    yPos += lineHeight;

    if (delivery.customerPhone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Telefone:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(delivery.customerPhone, margin + 25, yPos);
      yPos += lineHeight;
    }

    // Endereço de entrega
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço:', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    
    const addressLines = doc.splitTextToSize(
      `${delivery.deliveryAddress}${delivery.deliveryCity ? ', ' + delivery.deliveryCity : ''}${delivery.deliveryState ? ' - ' + delivery.deliveryState : ''}`,
      pageWidth - margin - 30
    );
    
    addressLines.forEach((line: string) => {
      doc.text(line, margin + 25, yPos);
      yPos += lineHeight;
    });

    // Produtos
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos:', margin + 5, yPos);
    yPos += lineHeight;

    delivery.products.forEach((product) => {
      // Verificar espaço
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const productText = `  • ${product.quantity}x ${product.name}${product.code ? ` (${product.code})` : ''}`;
      const productLines = doc.splitTextToSize(productText, pageWidth - margin - 10);
      
      productLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
      });
    });

    yPos += 1;

    // Total (ocultar para cargo deposito)
    if (userRole !== 'deposito') {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: R$ ${delivery.total.toFixed(2)}`, margin + 5, yPos);
      yPos += lineHeight + 1;
    }

    // Observações
    if (delivery.observations) {
      doc.setFont('helvetica', 'bold');
      doc.text('Obs:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      const obsLines = doc.splitTextToSize(delivery.observations, pageWidth - margin - 20);
      obsLines.forEach((line: string) => {
        doc.text(line, margin + 15, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    // Assinatura
    yPos += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Assinatura do Cliente: ___________________________________', margin + 5, yPos);
    yPos += 3;
    doc.text(`Data/Hora da Entrega: ____/____/____  ____:____`, margin + 5, yPos);
    yPos += 6;

    // Linha separadora
    if (index < deliveries.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
    }
  });

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  doc.save(`lista-entregas-${format(new Date(), 'dd-MM-yyyy-HHmm')}.pdf`);
};
