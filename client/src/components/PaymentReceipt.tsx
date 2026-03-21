import { AccountReceivable, Installment } from '@/types';
import { formatCurrency } from '@/lib/formatters';

interface PaymentReceiptProps {
  account: AccountReceivable;
  installment: Installment;
  paidAmount: number;
  paymentDate: Date;
}

export default function PaymentReceipt({ account, installment, paidAmount, paymentDate }: PaymentReceiptProps) {
  const isPartialPayment = paidAmount < installment.amount;
  const remainingAmount = installment.amount - paidAmount;

  return (
    <div style={{
      width: '210mm',
      height: '148.5mm',
      padding: '8mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '7pt',
      lineHeight: '1.3',
      color: '#000',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px solid #000', paddingBottom: '3mm' }}>
        <h1 style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold' }}>METAL TREVO</h1>
        <p style={{ margin: '1mm 0 0 0', fontSize: '6pt' }}>Comprovante de Pagamento</p>
      </div>

      {/* Informações do Pagamento */}
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
          <div style={{ flex: 1 }}>
            <strong>Data do Pagamento:</strong> {paymentDate.toLocaleDateString('pt-BR')} {paymentDate.toLocaleTimeString('pt-BR')}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <strong>Conta:</strong> #{account.id.substring(0, 8).toUpperCase()}
          </div>
        </div>
        
        <div style={{ marginBottom: '2mm' }}>
          <strong>Cliente:</strong> {account.clientName}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Parcela:</strong> {installment.installmentNumber}/{account.installments.length}
          </div>
          <div>
            <strong>Vencimento:</strong> {(installment.dueDate as any).toDate ? (installment.dueDate as any).toDate().toLocaleDateString('pt-BR') : new Date(installment.dueDate as any).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Valores */}
      <div style={{ 
        border: '1px solid #000', 
        padding: '3mm', 
        marginBottom: '4mm',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
          <span><strong>Valor da Parcela:</strong></span>
          <span>R$ {formatCurrency(installment.amount)}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '8pt',
          fontWeight: 'bold',
          paddingTop: '2mm',
          borderTop: '1px solid #000'
        }}>
          <span>VALOR PAGO:</span>
          <span style={{ color: '#008000' }}>R$ {formatCurrency(paidAmount)}</span>
        </div>

        {isPartialPayment && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '2mm',
            paddingTop: '2mm',
            borderTop: '1px dashed #666',
            color: '#cc0000'
          }}>
            <span><strong>Saldo Restante:</strong></span>
            <span>R$ {formatCurrency(remainingAmount)}</span>
          </div>
        )}
      </div>

      {/* Informações da Venda Original */}
      {account.saleId && (
        <div style={{ marginBottom: '4mm', fontSize: '6pt', color: '#666' }}>
          <strong>Referente à venda:</strong> #{account.saleId.substring(0, 8).toUpperCase()}
        </div>
      )}

      {/* Aviso de Pagamento Parcial */}
      {isPartialPayment && (
        <div style={{
          border: '1px solid #cc0000',
          backgroundColor: '#fff3cd',
          padding: '3mm',
          marginBottom: '4mm',
          fontSize: '6pt'
        }}>
          <strong>⚠️ PAGAMENTO PARCIAL</strong>
          <br />
          O saldo restante de R$ {formatCurrency(remainingAmount)} foi adicionado à próxima parcela.
        </div>
      )}

      {/* Observações */}
      <div style={{ 
        marginTop: '6mm',
        paddingTop: '3mm',
        borderTop: '1px solid #000',
        fontSize: '6pt',
        color: '#666'
      }}>
        <p style={{ margin: 0 }}>
          Este documento comprova o pagamento realizado na data indicada.
        </p>
        <p style={{ margin: '1mm 0 0 0' }}>
          Guarde este comprovante para controle financeiro.
        </p>
      </div>

      {/* Assinatura */}
      <div style={{
        position: 'absolute',
        bottom: '8mm',
        left: '8mm',
        right: '8mm',
        paddingTop: '4mm',
        borderTop: '1px solid #000',
        fontSize: '6pt',
        textAlign: 'center'
      }}>
        Assinatura do Responsável
      </div>
    </div>
  );
}
