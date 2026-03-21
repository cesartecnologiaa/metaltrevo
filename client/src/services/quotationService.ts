import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { createSale } from './salesService';
import { createAccountReceivable } from './accountsReceivableService';
import { Sale, PaymentMethod } from '@/types';

export interface QuotationItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  priceType: 'vista' | 'prazo';
  total: number;
}

export interface Quotation {
  id: string;
  code: string;
  date: Timestamp;
  validUntil: Timestamp;
  clientId: string;
  clientName: string;
  clientDocument?: string;
  sellerId: string;
  sellerName: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  observations?: string;
  status: 'pendente' | 'convertido' | 'vencido' | 'cancelada';
  convertedAt?: Timestamp;
  convertedBy?: string;
  convertedByName?: string;
  saleId?: string;
  canceledAt?: Timestamp;
  canceledBy?: string;
  canceledByName?: string;
  cancelReason?: string;
}

export async function createQuotation(data: Omit<Quotation, 'id'>): Promise<string> {
  const quotationData = {
    ...data,
    status: 'pendente' as const,
  };
  const docRef = await addDoc(collection(db, 'quotations'), quotationData);
  return docRef.id;
}

export async function getQuotations(): Promise<Quotation[]> {
  const q = query(collection(db, 'quotations'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation));
}


/**
 * Converter orçamento em venda real
 */
export async function convertQuotationToSale(
  quotationId: string,
  quotation: Quotation,
  paymentMethod: PaymentMethod,
  installmentCount: number,
  userId: string,
  userName: string
): Promise<string> {
  // Criar venda a partir do orçamento
  const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleNumber'> = {
    items: quotation.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.total,
    })),
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    total: quotation.total,
    paymentMethod,
    status: 'concluida',
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    clientDocument: quotation.clientDocument,
    deliveryType: 'balcao',
    deliveryFee: quotation.deliveryFee,
    sellerId: userId,
    sellerName: userName,
  };

  const saleId = await createSale(saleData);

  // Criar conta a receber se for parcelado
  if ((paymentMethod === 'boleto' || paymentMethod === 'cartao_credito') && installmentCount > 1) {
    await createAccountReceivable(
      saleId,
      '', // saleNumber será preenchido pelo service
      quotation.clientId,
      quotation.clientName,
      quotation.clientDocument,
      quotation.total,
      installmentCount
    );
  }

  // Atualizar status do orçamento
  const quotationRef = doc(db, 'quotations', quotationId);
  await updateDoc(quotationRef, {
    status: 'convertido',
    convertedAt: Timestamp.now(),
    convertedBy: userId,
    convertedByName: userName,
    saleId,
  });

  return saleId;
}

/**
 * Cancelar orçamento
 */
export async function cancelQuotation(
  quotationId: string,
  reason: string,
  userId: string,
  userName: string
): Promise<void> {
  const quotationRef = doc(db, 'quotations', quotationId);
  await updateDoc(quotationRef, {
    status: 'cancelada',
    canceledAt: Timestamp.now(),
    canceledBy: userId,
    canceledByName: userName,
    cancelReason: reason,
  });
}

/**
 * Atualizar status de orçamentos vencidos
 */
export async function updateExpiredQuotations(): Promise<void> {
  const quotations = await getQuotations();
  const now = new Date();

  for (const quotation of quotations) {
    if (quotation.status === 'pendente') {
      const validUntil = quotation.validUntil instanceof Timestamp 
        ? quotation.validUntil.toDate() 
        : new Date(quotation.validUntil);

      if (validUntil < now) {
        const quotationRef = doc(db, 'quotations', quotation.id);
        await updateDoc(quotationRef, {
          status: 'vencido',
        });
      }
    }
  }
}
