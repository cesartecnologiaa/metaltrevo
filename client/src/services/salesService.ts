import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { prepareForFirestore } from '@/lib/firestoreUtils';
import { Sale, SaleItem, CancellationAudit, EditAudit, StockMovement } from '@/types';
import { getProductById, updateProductStock } from './productService';
import { cancelAccountReceivable } from './accountsReceivableService';

/**
 * Criar nova venda
 */
export async function createSale(
  saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleNumber'>
): Promise<string> {
  const salesRef = collection(db, 'sales');
  
  // Validar estoque antes de criar venda
  for (const item of saleData.items) {
    const product = await getProductById(item.productId);
    if (!product) {
      throw new Error(`Produto ${item.productName} não encontrado`);
    }
    if (product.currentStock < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.productName}. Disponível: ${product.currentStock}`);
    }
  }
  
  // Gerar número sequencial da venda
  const salesSnapshot = await getDocs(query(salesRef, orderBy('createdAt', 'desc')));
  const lastSaleNumber = salesSnapshot.docs[0]?.data()?.saleNumber || 'VD000000';
  const nextNumber = parseInt(lastSaleNumber.replace('VD', '')) + 1;
  const saleNumber = `VD${String(nextNumber).padStart(6, '0')}`;
  
  const newSale = {
    ...saleData,
    saleNumber,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(salesRef, newSale);
  
  // Registrar movimentação de estoque e atualizar produtos
  await registerStockMovements(docRef.id, saleData.items, saleData.sellerId, saleData.sellerName, 'saida');
  
  return docRef.id;
}

/**
 * Cancelar venda com auditoria completa
 */
export async function cancelSale(
  saleId: string,
  userId: string,
  userName: string,
  reason: string
): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);
  const saleDoc = await getDoc(saleRef);
  
  if (!saleDoc.exists()) {
    throw new Error('Venda não encontrada');
  }
  
  const sale = saleDoc.data() as Sale;
  
  if (sale.status === 'cancelada') {
    throw new Error('Esta venda já foi cancelada');
  }
  
  // Criar auditoria de cancelamento
  const cancellation: CancellationAudit = {
    cancelledBy: userId,
    cancelledByName: userName,
    cancelledAt: Timestamp.now(),
    reason,
  };
  
  // Atualizar venda
  await updateDoc(saleRef, prepareForFirestore({
    status: 'cancelada',
    cancellation,
    updatedAt: Timestamp.now(),
  }));
  
  // Estornar estoque
  await registerStockMovements(
    saleId, 
    sale.items, 
    userId, 
    userName, 
    'cancelamento',
    `Cancelamento da venda ${sale.saleNumber} - Motivo: ${reason}`
  );
  
  // Cancelar conta a receber (se houver)
  await cancelAccountReceivable(saleId, userId, userName);
}

/**
 * Editar venda com auditoria
 */
export async function editSale(
  saleId: string,
  updates: Partial<Sale>,
  userId: string,
  userName: string,
  changes: string
): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);
  const saleDoc = await getDoc(saleRef);
  
  if (!saleDoc.exists()) {
    throw new Error('Venda não encontrada');
  }
  
  const sale = saleDoc.data() as Sale;
  
  if (sale.status === 'cancelada') {
    throw new Error('Não é possível editar uma venda cancelada');
  }
  
  // Criar registro de edição
  const editAudit: EditAudit = {
    editedBy: userId,
    editedByName: userName,
    editedAt: Timestamp.now(),
    changes,
  };
  
  // Adicionar à lista de edições
  const edits = sale.edits || [];
  edits.push(editAudit);
  
  // Atualizar venda
  await updateDoc(saleRef, prepareForFirestore({
    ...updates,
    edits,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * Atualizar status de entrega
 */
export async function updateDeliveryStatus(
  saleId: string,
  deliveryStatus: 'pendente' | 'entregue',
  userId?: string,
  userName?: string
): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);
  const saleDoc = await getDoc(saleRef);
  
  if (!saleDoc.exists()) {
    throw new Error('Venda não encontrada');
  }
  
  const sale = saleDoc.data() as Sale;
  
  if (sale.status === 'cancelada') {
    throw new Error('Não é possível alterar status de entrega de uma venda cancelada');
  }
  
  // Permitir alterar status tanto para 'entrega' quanto 'deposito'
  if (sale.deliveryType !== 'entrega' && sale.deliveryType !== 'deposito') {
    throw new Error('Esta venda não possui tipo de entrega válido');
  }
  
  // Preparar dados de atualização
  const updateData: any = {
    deliveryStatus,
    updatedAt: Timestamp.now(),
  };
  
  // Se está marcando como entregue, adicionar info de quem entregou
  if (deliveryStatus === 'entregue' && userId && userName) {
    updateData.deliveredBy = userId;
    updateData.deliveredByName = userName;
    updateData.deliveredAt = Timestamp.now();
  }
  
  await updateDoc(saleRef, prepareForFirestore(updateData));
}

/**
 * Registrar movimentações de estoque
 */
async function registerStockMovements(
  saleId: string,
  items: SaleItem[],
  userId: string,
  userName: string,
  type: 'saida' | 'cancelamento',
  customReason?: string
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const item of items) {
    const productRef = doc(db, 'products', item.productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      console.warn(`Produto ${item.productId} não encontrado`);
      continue;
    }
    
    const product = productDoc.data();
    const currentStock = product.currentStock || 0;
    
    // Calcular novo estoque
    const stockChange = type === 'saida' ? -item.quantity : item.quantity;
    const newStock = currentStock + stockChange;
    
    // Atualizar estoque do produto
    batch.update(productRef, {
      currentStock: newStock,
      updatedAt: Timestamp.now(),
    });
    
    // Criar registro de movimentação
    const movementRef = doc(collection(db, 'stock_movements'));
    const movement: Omit<StockMovement, 'id'> = {
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      type,
      quantity: Math.abs(stockChange),
      previousStock: currentStock,
      newStock,
      reason: customReason || (type === 'saida' ? `Venda ${saleId}` : `Cancelamento da venda ${saleId}`),
      userId,
      userName,
      saleId,
      createdAt: Timestamp.now(),
    };
    
    batch.set(movementRef, movement);
  }
  
  await batch.commit();
}

/**
 * Buscar vendas com filtros
 */
export async function getSales(filters?: {
  status?: Sale['status'];
  sellerId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Sale[]> {
  const salesRef = collection(db, 'sales');
  let q = query(salesRef, orderBy('createdAt', 'desc'));
  
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters?.sellerId) {
    q = query(q, where('sellerId', '==', filters.sellerId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Sale[];
}

/**
 * Buscar venda por ID
 */
export async function getSaleById(saleId: string): Promise<Sale | null> {
  const saleDoc = await getDoc(doc(db, 'sales', saleId));
  
  if (!saleDoc.exists()) {
    return null;
  }
  
  return {
    id: saleDoc.id,
    ...saleDoc.data(),
  } as Sale;
}

/**
 * Buscar histórico de movimentações de estoque
 */
export async function getStockMovements(productId?: string): Promise<StockMovement[]> {
  const movementsRef = collection(db, 'stock_movements');
  let q = query(movementsRef, orderBy('createdAt', 'desc'));
  
  if (productId) {
    q = query(q, where('productId', '==', productId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
}
