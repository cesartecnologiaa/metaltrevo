import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface CompanySettings {
  name: string;
  subtitle?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  logo?: string;
}

/**
 * Adiciona cabeçalho padrão ao PDF com dados da empresa
 * Layout centralizado igual ao comprovante de vendas
 * @param doc - Instância do jsPDF
 * @param settings - Configurações da empresa
 * @param title - Título do documento
 * @param subtitle - Subtítulo opcional (ex: período do relatório)
 * @returns Posição Y onde o conteúdo deve começar
 */
export const addPDFHeader = async (
  doc: jsPDF,
  settings: CompanySettings,
  title: string,
  subtitle?: string
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Logo e Nome da Empresa - Centralizados lado a lado
  if (settings.logo) {
    try {
      const logoSize = 15;
      const logoX = (pageWidth / 2) - 25; // Centralizar conjunto logo+nome
      
      // Adicionar logo
      doc.addImage(settings.logo, 'PNG', logoX, yPos, logoSize, logoSize);
      
      // Nome da empresa ao lado do logo
      doc.setTextColor(17, 17, 17); // #111
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.name, logoX + logoSize + 3, yPos + 6);
      
      // Subtitle abaixo do nome (se existir)
      if (settings.subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 102, 102); // #666
        doc.text(settings.subtitle, logoX + logoSize + 3, yPos + 11);
      }
      
      yPos += logoSize + 3;
    } catch (error) {
      // Se falhar ao carregar logo, usar apenas texto centralizado
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      
      if (settings.subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text(settings.subtitle, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      yPos += 3;
    }
  } else {
    // Sem logo - Nome centralizado
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    if (settings.subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(settings.subtitle, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    }
    yPos += 3;
  }

  // Informações da empresa - Centralizadas
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  
  // Endereço
  if (settings.address && settings.city && settings.state && settings.zipCode) {
    const addressLine = `${settings.address}, ${settings.city} - ${settings.state}, CEP: ${settings.zipCode}`;
    doc.text(addressLine, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  
  // Contatos (Tel | Email | CNPJ)
  const contactInfo: string[] = [];
  if (settings.phone) contactInfo.push(`Tel: ${settings.phone}`);
  if (settings.email) contactInfo.push(`Email: ${settings.email}`);
  if (settings.cnpj) contactInfo.push(`CNPJ: ${settings.cnpj}`);
  
  if (contactInfo.length > 0) {
    doc.text(contactInfo.join(' | '), pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  // Linha separadora
  yPos += 3;
  doc.setDrawColor(229, 231, 235); // #e5e7eb
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  // Título do documento
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Subtítulo (ex: período)
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }

  // Linha separadora final
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  return yPos;
};

/**
 * Adiciona rodapé padrão ao PDF
 * @param doc - Instância do jsPDF
 */
export const addPDFFooter = (doc: jsPDF): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
};
