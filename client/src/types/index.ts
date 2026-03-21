import { Timestamp } from 'firebase/firestore';

// Tipos de Role de Usuário
export type UserRole = 'admin' | 'vendedor' | 'deposito';

// Usuário
export interface User {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy?: string; // UID do admin que criou
}

// Tipos de Status de Venda
export type SaleStatus = 'concluida' | 'cancelada' | 'pendente';

// Tipos de Forma de Pagamento
export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'boleto';

// Item de Venda
export interface SaleItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Parcela (Installment)
export interface Installment {
  installmentNumber: number; // Número da parcela (1, 2, 3...)
  dueDate: Date | Timestamp; // Data de vencimento
  amount: number; // Valor da parcela
  status: 'pendente' | 'paga' | 'vencida' | 'cancelada'; // Status da parcela
  paidAt?: Date | Timestamp; // Data do pagamento (se paga)
  paidBy?: string; // UID do usuário que marcou como paga
  paidByName?: string; // Nome do usuário que marcou como paga
}

// Conta a Receber
export interface AccountReceivable {
  id: string;
  saleId: string; // ID da venda relacionada
  saleNumber: string; // Número da venda
  clientId?: string;
  clientName?: string;
  clientDocument?: string;
  totalAmount: number; // Valor total
  installments: Installment[]; // Lista de parcelas
  status: 'pendente' | 'paga' | 'parcial' | 'cancelada'; // Status geral
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Auditoria de Cancelamento
export interface CancellationAudit {
  cancelledBy: string; // UID do usuário que cancelou
  cancelledByName: string; // Nome do usuário que cancelou
  cancelledAt: Date | Timestamp;
  reason: string; // Motivo do cancelamento
}

// Auditoria de Edição
export interface EditAudit {
  editedBy: string; // UID do usuário que editou
  editedByName: string; // Nome do usuário que editou
  editedAt: Date | Timestamp;
  changes: string; // Descrição das mudanças
}

// Venda Completa
export interface Sale {
  id: string;
  saleNumber: string; // Número sequencial da venda
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  
  // Cliente (opcional)
  clientId?: string;
  clientName?: string;
  clientDocument?: string;
  
  // Entrega
  deliveryType?: 'balcao' | 'deposito' | 'entrega';
  deliveryAddress?: string;
  deliveryDate?: Date | Timestamp; // Data prevista de entrega (para deliveryType='entrega')
  deliveryFee?: number;
  deliveryStatus?: 'pendente' | 'entregue'; // Status de entrega (para deliveryType='deposito' ou 'entrega')
  withdrawnAt?: Date | Timestamp; // Data/hora da retirada (para deposito)
  withdrawnBy?: string; // UID do usuário que deu baixa
  withdrawnByName?: string; // Nome do usuário que deu baixa
  deliveredAt?: Date | Timestamp; // Data/hora da entrega/retirada
  deliveredByName?: string; // Nome do usuário que registrou a entrega
  
  // Vendedor
  sellerId: string;
  sellerName: string;
  
  // Parcelamento (apenas para boleto)
  installments?: Installment[];
  installmentCount?: number; // Número de parcelas
  
  // Datas
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  
  // Auditoria
  cancellation?: CancellationAudit;
  edits?: EditAudit[];
  
  // Observações
  notes?: string;
}

// Produto
export interface Product {
  id: string;
  name: string;
  code: string; // Código do produto (ex: MT0001)
  description?: string;
  price: number; // Preço padrão (manter para compatibilidade)
  cashPrice: number; // Preço à vista (dinheiro, PIX, débito)
  creditPrice: number; // Preço a prazo (crédito, boleto)
  costPrice: number; // Preço de custo
  currentStock: number; // Estoque atual
  minStock: number; // Estoque mínimo
  categoryId?: string;
  categoryName?: string;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Movimentação de Estoque
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'cancelamento';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  saleId?: string; // Referência à venda (se aplicável)
  createdAt: Date | Timestamp;
}

// Cliente
export interface Client {
  id: string;
  code: string; // Código de 4 dígitos
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Fornecedor
export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Categoria
export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Relatório de Vendas
export interface SalesReport {
  period: {
    start: Date;
    end: Date;
  };
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageTicket: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  salesByPaymentMethod: {
    method: PaymentMethod;
    count: number;
    total: number;
  }[];
  salesBySeller: {
    sellerId: string;
    sellerName: string;
    count: number;
    total: number;
  }[];
}
