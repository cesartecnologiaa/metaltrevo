import React, { forwardRef } from 'react';
import { format, isValid } from 'date-fns';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface CashClosureReceiptProps {
  cashRegister: {
    openedAt: any;
    closedAt: any;
    openedByName: string;
    closedByName?: string;
    initialBalance: number;
    totalSales: number;
    totalWithdrawals: number;
    finalBalance: number;
  };
}

const CashClosureReceipt = forwardRef<HTMLDivElement, CashClosureReceiptProps>(
  ({ cashRegister }, ref) => {
    const { settings } = useCompanySettings();

    // Helper para formatar datas com validação
    const formatDate = (date: any): string => {
      if (!date) return '';
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      if (!isValid(dateObj)) return '';
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    return (
      <div ref={ref} style={{ display: 'none' }}>
        <style>{`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }

          .cash-receipt-container {
            width: 210mm;
            min-height: 148.5mm;
            padding: 8mm;
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            background: white;
            color: #000;
          }

          .cash-receipt-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }

          .cash-receipt-logo {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }

          .cash-receipt-company {
            text-align: center;
          }

          .cash-receipt-company-name {
            font-size: 14pt;
            font-weight: bold;
            margin: 0;
          }

          .cash-receipt-company-subtitle {
            font-size: 9pt;
            color: #666;
            margin: 2px 0 0 0;
          }

          .cash-receipt-info {
            text-align: center;
            margin-bottom: 8px;
          }

          .cash-receipt-info p {
            margin: 2px 0;
            font-size: 8pt;
          }

          .cash-receipt-title {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin: 12px 0 8px 0;
            padding: 6px;
            background: #f0f0f0;
            border: 1px solid #ccc;
          }

          .cash-receipt-details {
            margin: 12px 0;
          }

          .cash-receipt-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 6px;
          }

          .cash-receipt-field {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #ddd;
          }

          .cash-receipt-label {
            font-weight: bold;
            color: #333;
          }

          .cash-receipt-value {
            color: #000;
          }

          .cash-receipt-summary {
            margin-top: 16px;
            padding: 12px;
            background: #f9f9f9;
            border: 2px solid #333;
            border-radius: 4px;
          }

          .cash-receipt-summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 10pt;
          }

          .cash-receipt-summary-row.total {
            font-size: 12pt;
            font-weight: bold;
            border-top: 2px solid #333;
            margin-top: 8px;
            padding-top: 8px;
          }

          .cash-receipt-footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }

          .cash-receipt-signature {
            margin-top: 32px;
            text-align: center;
          }

          .cash-receipt-signature-line {
            display: inline-block;
            width: 200px;
            border-top: 1px solid #000;
            margin-top: 40px;
          }

          .cash-receipt-signature-label {
            margin-top: 4px;
            font-size: 8pt;
          }
        `}</style>

        <div className="cash-receipt-container">
          {/* Cabeçalho */}
          <div className="cash-receipt-header">
            {settings?.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="cash-receipt-logo"
              />
            )}
            <div className="cash-receipt-company">
              <h1 className="cash-receipt-company-name">
                {settings?.name || 'Metal Trevo'}
              </h1>
              <p className="cash-receipt-company-subtitle">
                Sistema de Gestão Comercial
              </p>
            </div>
          </div>

          {/* Informações da empresa */}
          <div className="cash-receipt-info">
            {settings?.address && <p>{settings.address}</p>}
            {settings?.phone && <p>Tel: {settings.phone}</p>}
            {settings?.email && <p>E-mail: {settings.email}</p>}
          </div>

          {/* Título */}
          <div className="cash-receipt-title">COMPROVANTE DE FECHAMENTO DE CAIXA</div>

          {/* Detalhes do Caixa */}
          <div className="cash-receipt-details">
            <div className="cash-receipt-row">
              <div className="cash-receipt-field">
                <span className="cash-receipt-label">Abertura:</span>
                <span className="cash-receipt-value">
                  {formatDate(cashRegister.openedAt)}
                </span>
              </div>
              <div className="cash-receipt-field">
                <span className="cash-receipt-label">Fechamento:</span>
                <span className="cash-receipt-value">
                  {formatDate(cashRegister.closedAt)}
                </span>
              </div>
            </div>

            <div className="cash-receipt-row">
              <div className="cash-receipt-field">
                <span className="cash-receipt-label">Aberto por:</span>
                <span className="cash-receipt-value">
                  {cashRegister.openedByName}
                </span>
              </div>
              <div className="cash-receipt-field">
                <span className="cash-receipt-label">Fechado por:</span>
                <span className="cash-receipt-value">
                  {cashRegister.closedByName || cashRegister.openedByName}
                </span>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="cash-receipt-summary">
            <div className="cash-receipt-summary-row">
              <span>Saldo Inicial:</span>
              <span>{formatCurrency(cashRegister.initialBalance)}</span>
            </div>
            <div className="cash-receipt-summary-row">
              <span>Total de Vendas:</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                {formatCurrency(cashRegister.totalSales)}
              </span>
            </div>
            <div className="cash-receipt-summary-row">
              <span>Sangrias:</span>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                {formatCurrency(cashRegister.totalWithdrawals)}
              </span>
            </div>
            <div className="cash-receipt-summary-row total">
              <span>Saldo Final:</span>
              <span>{formatCurrency(cashRegister.finalBalance)}</span>
            </div>
          </div>

          {/* Assinatura */}
          <div className="cash-receipt-signature">
            <div className="cash-receipt-signature-line"></div>
            <div className="cash-receipt-signature-label">
              Assinatura do Responsável
            </div>
          </div>

          {/* Rodapé */}
          <div className="cash-receipt-footer">
            <p>Este documento é um comprovante de fechamento de caixa</p>
            <p>Emitido em {format(new Date(), 'dd/MM/yyyy \'às\' HH:mm')}</p>
          </div>
        </div>
      </div>
    );
  }
);

CashClosureReceipt.displayName = 'CashClosureReceipt';

export default CashClosureReceipt;
