import { forwardRef } from 'react';
import { format, isValid } from 'date-fns';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { formatCurrency } from '@/lib/formatters';

interface QuotationReceiptProps {
  quotation: any;
}

const QuotationReceipt = forwardRef<HTMLDivElement, QuotationReceiptProps>(({ quotation }, ref) => {
  const { settings } = useCompanySettings();
  
  const formatDate = (date: Date | any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (!isValid(d)) return '';
    return format(d, 'dd/MM/yyyy HH:mm');
  };

  const formatDateOnly = (date: Date | any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (!isValid(d)) return '';
    return format(d, 'dd/MM/yyyy');
  };

  return (
    <div ref={ref} className="receipt-container">
      <div className="receipt-content">
        {/* Cabeçalho - Logo e Nome próximos, informações centralizadas */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          {/* Logo e Nome da Empresa */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #9333ea, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>{settings.name.substring(0, 2).toUpperCase()}</div>
            )}
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#111' }}>{settings.name}</h1>
              {settings.subtitle && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>{settings.subtitle}</p>
              )}
            </div>
          </div>
          
          {/* Informações da empresa */}
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
            {settings.address && <div>{settings.address}, {settings.city} - {settings.state}, CEP: {settings.zipCode}</div>}
            {(settings.phone || settings.email || settings.cnpj) && (
              <div style={{ marginTop: '4px' }}>
                {settings.phone && <span>Tel: {settings.phone}</span>}
                {settings.phone && settings.email && <span> | </span>}
                {settings.email && <span>Email: {settings.email}</span>}
                {settings.email && settings.cnpj && <span> | </span>}
                {settings.cnpj && <span>CNPJ: {settings.cnpj}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '2px solid #e5e7eb', margin: '12px 0' }}></div>

        {/* Informações do Orçamento - Grid Compacto */}
        <div className="sale-info">
          <div className="info-grid">
            <div><strong>Orçamento Nº:</strong> {quotation.code}</div>
            <div><strong>Data:</strong> {formatDate(quotation.date)}</div>
            <div><strong>Vendedor:</strong> {quotation.sellerName}</div>
            <div><strong>Válido até:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatDateOnly(quotation.validUntil)}</span></div>
          </div>
          {quotation.clientName && (
            <div className="client-info">
              <strong>Cliente:</strong> {quotation.clientName} {quotation.clientDocument ? `- ${quotation.clientDocument}` : ''}
            </div>
          )}
        </div>

        <div className="divider"></div>

        {/* Produtos - Tabela Compacta */}
        <table className="products-table">
          <thead>
            <tr>
              <th>Cód</th>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.productCode}</td>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>R$ {formatCurrency(item.unitPrice)}</td>
                <td>R$ {formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divider"></div>

        {/* Totais */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>R$ {formatCurrency(quotation.subtotal)}</span>
          </div>
          {quotation.discount > 0 && (
            <div className="total-row">
              <span>Desconto:</span>
              <span className="discount">- R$ {formatCurrency(quotation.discount)}</span>
            </div>
          )}
          {quotation.deliveryFee && quotation.deliveryFee > 0 && (
            <div className="total-row">
              <span>Frete:</span>
              <span>R$ {formatCurrency(quotation.deliveryFee)}</span>
            </div>
          )}
          <div className="total-row total-final">
            <span>TOTAL:</span>
            <span>R$ {formatCurrency(quotation.total)}</span>
          </div>
        </div>

        {/* Entrega */}
        {quotation.deliveryType && quotation.deliveryType !== 'balcao' && (
          <>
            <div className="divider"></div>
            <div className="delivery-info">
              <div className="delivery-grid">
                <div><strong>Entrega:</strong> {quotation.deliveryType === 'entrega' ? 'Entrega' : 'Retirada no Depósito'}</div>
              </div>
              {quotation.deliveryAddress && (
                <div className="delivery-address">
                  <strong>Endereço:</strong> {quotation.deliveryAddress}
                </div>
              )}
            </div>
          </>
        )}

        {quotation.observations && (
          <>
            <div className="divider"></div>
            <div className="notes">
              <strong>Observações:</strong> {quotation.observations}
            </div>
          </>
        )}

        {/* Assinatura */}
        <div className="signature">
          <div className="signature-line"></div>
          <p>Assinatura do Cliente</p>
        </div>

        {/* Rodapé */}
        <div className="footer">
          <p>Obrigado pela preferência!</p>
          <p className="small">Este documento não tem valor fiscal | Impresso em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .receipt-container {
            page-break-after: always;
          }
        }

        .receipt-container {
          width: 210mm;
          height: 148.5mm;
          background: white;
          color: black;
          font-family: 'Arial', sans-serif;
          font-size: 9pt;
          padding: 8mm;
          box-sizing: border-box;
          page-break-after: always;
        }

        .receipt-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Cabeçalho Simples - Logo + Nome */
        .receipt-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #9333ea, #ec4899);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          flex-shrink: 0;
        }

        .company-logo-img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .company-name {
          margin: 0;
          font-size: 16pt;
          font-weight: bold;
          color: #111;
        }

        .divider {
          border-top: 1px dashed #ccc;
          margin: 6px 0;
        }

        /* Informações da Venda */
        .sale-info {
          margin-bottom: 6px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          font-size: 8.5pt;
          margin-bottom: 4px;
        }

        .info-grid strong {
          color: #333;
        }

        .client-info {
          font-size: 8.5pt;
          margin-top: 4px;
          padding: 4px;
          background: #f9fafb;
          border-radius: 3px;
        }

        .status-concluida {
          color: #10b981;
          font-weight: bold;
        }

        .status-cancelada {
          color: #ef4444;
          font-weight: bold;
        }

        /* Tabela de Produtos */
        .products-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin: 4px 0;
        }

        .products-table th {
          background: #f3f4f6;
          padding: 4px 6px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #d1d5db;
        }

        .products-table td {
          padding: 3px 6px;
          border-bottom: 1px solid #e5e7eb;
        }

        .products-table th:nth-child(3),
        .products-table td:nth-child(3),
        .products-table th:nth-child(4),
        .products-table td:nth-child(4),
        .products-table th:nth-child(5),
        .products-table td:nth-child(5) {
          text-align: right;
        }

        /* Totais */
        .totals {
          margin-top: 6px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
          margin-bottom: 2px;
        }

        .total-row.total-final {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 2px solid #333;
        }

        .total-row.payment {
          margin-top: 4px;
          font-weight: bold;
          color: #9333ea;
        }

        .total-row .discount {
          color: #ef4444;
        }

        /* Entrega */
        .delivery-info {
          font-size: 8pt;
          padding: 4px;
          background: #f0f9ff;
          border-radius: 3px;
        }

        .delivery-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 12px;
          margin-bottom: 3px;
        }

        .delivery-address {
          margin-top: 3px;
        }

        .delivery-completed {
          margin-top: 3px;
          color: #0369a1;
        }

        /* Observações */
        .notes {
          font-size: 8pt;
          padding: 4px;
          background: #f9fafb;
          border-radius: 3px;
        }

        /* Cancelamento */
        .cancellation {
          padding: 6px;
          background: #fee2e2;
          border: 2px solid #ef4444;
          border-radius: 4px;
          font-size: 8pt;
        }

        .cancellation h3 {
          margin: 0 0 4px 0;
          color: #ef4444;
          font-size: 10pt;
        }

        .cancellation p {
          margin: 2px 0;
        }

        /* Assinatura */
        .signature {
          margin-top: auto;
          padding-top: 12px;
          text-align: center;
        }

        .signature-line {
          width: 50%;
          margin: 0 auto 4px;
          border-top: 1px solid #333;
        }

        .signature p {
          margin: 0;
          font-size: 8pt;
          color: #666;
        }

        /* Rodapé */
        .footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #ddd;
        }

        .footer p {
          margin: 2px 0;
          font-size: 8pt;
        }

        .footer .small {
          font-size: 7pt;
          color: #999;
        }
      `}</style>
    </div>
  );
});

QuotationReceipt.displayName = 'QuotationReceipt';

export default QuotationReceipt;
