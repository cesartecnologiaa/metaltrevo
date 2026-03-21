import { useRef } from 'react';
import { Sale } from '@/types';
import html2pdf from 'html2pdf.js';

export function usePrintReceipt() {
  const printRef = useRef<HTMLDivElement>(null);

  const printReceipt = () => {
    if (!printRef.current) {
      console.error('Print ref not found');
      return;
    }

    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }

    // Copiar conteúdo para a janela de impressão
    const content = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprovante de Venda</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const exportToPDF = (filename: string = 'orcamento.pdf') => {
    if (!printRef.current) {
      console.error('Print ref not found');
      return;
    }

    const element = printRef.current;
    
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  return {
    printRef,
    printReceipt,
    exportToPDF,
  };
}
