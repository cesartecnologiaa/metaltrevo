import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { prepareForFirestore } from '@/lib/firestoreUtils';
import { AccountReceivable, Installment } from '@/types';

/**
 * Criar conta a receber a partir de uma venda parcelada
 */
export async function createAccountReceivable(
  saleId: string,
  saleNumber: string,
  clientId: string | undefined,
  clientName: string | undefined,
  clientDocument: string | undefined,
  totalAmount: number,
  installmentCount: number
): Promise<string> {
  const accountsRef = collection(db, 'accountsReceivable');
  
  // Calcular parcelas
  const installmentAmount = totalAmount / installmentCount;
  const installments: Installment[] = [];
  
  for (let i = 1; i <= installmentCount; i++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (30 * i)); // 30 dias entre cada parcela
    
    // Garantir que a data seja meio-dia LOCAL para evitar problemas de timezone
    const dueDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      12, 0, 0, 0
    );
    
    installments.push({
      installmentNumber: i,
      dueDate: Timestamp.fromDate(dueDate),
      amount: installmentAmount,
      status: 'pendente',
    });
  }
  
  const accountReceivable: Omit<AccountReceivable, 'id'> = {
    saleId,
    saleNumber,
    clientId,
    clientName,
    clientDocument,
    totalAmount,
    installments,
    status: 'pendente',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(accountsRef, accountReceivable);
  return docRef.id;
}

/**
 * Buscar todas as contas a receber
 */
export async function getAllAccountsReceivable(): Promise<AccountReceivable[]> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const snapshot = await getDocs(accountsRef);
    
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AccountReceivable[];
    
    // Ordenar por data de criação (mais recentes primeiro)
    return accounts.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching accounts receivable:', error);
    return [];
  }
}

/**
 * Buscar contas a receber por status
 */
export async function getAccountsReceivableByStatus(
  status: 'pendente' | 'paga' | 'parcial'
): Promise<AccountReceivable[]> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const q = query(accountsRef, where('status', '==', status));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AccountReceivable[];
  } catch (error) {
    console.error('Error fetching accounts by status:', error);
    return [];
  }
}

/**
 * Buscar conta a receber por ID da venda
 */
export async function getAccountReceivableBySaleId(
  saleId: string
): Promise<AccountReceivable | null> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const q = query(accountsRef, where('saleId', '==', saleId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as AccountReceivable;
  } catch (error) {
    console.error('Error fetching account by sale ID:', error);
    return null;
  }
}

/**
 * Marcar parcela como paga
 */
export async function markInstallmentAsPaid(
  accountId: string,
  installmentNumber: number,
  userId: string,
  userName: string
): Promise<void> {
  const accountRef = doc(db, 'accountsReceivable', accountId);
  const accountDoc = await getDoc(accountRef);
  
  if (!accountDoc.exists()) {
    throw new Error('Conta a receber não encontrada');
  }
  
  const account = accountDoc.data() as AccountReceivable;
  
  // Atualizar parcela
  const updatedInstallments = account.installments.map(inst => {
    if (inst.installmentNumber === installmentNumber) {
      return {
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: inst.amount,
        status: 'paga' as const,
        paidAt: Timestamp.now(),
        paidBy: userId,
        paidByName: userName,
      };
    }
    return inst;
  });
  
  // Calcular novo status geral
  const allPaid = updatedInstallments.every(inst => inst.status === 'paga');
  const somePaid = updatedInstallments.some(inst => inst.status === 'paga');
  const newStatus = allPaid ? 'paga' : (somePaid ? 'parcial' : 'pendente');
  
  await updateDoc(accountRef, {
    installments: updatedInstallments,
    status: newStatus,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Processar pagamento parcial de uma parcela
 */
export async function processPartialPayment(
  accountId: string,
  installmentNumber: number,
  paidAmount: number,
  userId: string,
  userName: string
): Promise<void> {
  const accountRef = doc(db, 'accountsReceivable', accountId);
  const accountDoc = await getDoc(accountRef);
  
  if (!accountDoc.exists()) {
    throw new Error('Conta a receber não encontrada');
  }
  
  const account = accountDoc.data() as AccountReceivable;
  const installment = account.installments.find(i => i.installmentNumber === installmentNumber);
  
  if (!installment) {
    throw new Error('Parcela não encontrada');
  }
  
  if (paidAmount >= installment.amount) {
    // Pagamento total - marcar como paga
    const updatedInstallments = account.installments.map(inst => {
      if (inst.installmentNumber === installmentNumber) {
        return {
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          amount: inst.amount,
          status: 'paga' as const,
          paidAt: Timestamp.now(),
          paidBy: userId,
          paidByName: userName,
        };
      }
      return inst;
    });
    
    const allPaid = updatedInstallments.every(inst => inst.status === 'paga');
    const somePaid = updatedInstallments.some(inst => inst.status === 'paga');
    const newStatus = allPaid ? 'paga' : (somePaid ? 'parcial' : 'pendente');
    
    await updateDoc(accountRef, {
      installments: updatedInstallments,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
  } else {
    // Pagamento parcial - adicionar saldo na próxima parcela
    const remainingAmount = installment.amount - paidAmount;
    
    const updatedInstallments = account.installments.map(inst => {
      if (inst.installmentNumber === installmentNumber) {
        // Marcar parcela atual como paga com valor parcial
        return {
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          amount: paidAmount,
          originalAmount: installment.amount,
          status: 'paga' as const,
          paidAt: Timestamp.now(),
          paidBy: userId,
          paidByName: userName,
          partialPayment: true,
        };
      }
      // Adicionar saldo na próxima parcela pendente
      if (inst.installmentNumber === installmentNumber + 1 && inst.status !== 'paga') {
        return {
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          amount: inst.amount + remainingAmount,
          previousBalance: remainingAmount,
          status: inst.status,
        };
      }
      return inst;
    });
    
    const allPaid = updatedInstallments.every(inst => inst.status === 'paga');
    const somePaid = updatedInstallments.some(inst => inst.status === 'paga');
    const newStatus = allPaid ? 'paga' : (somePaid ? 'parcial' : 'pendente');
    
    await updateDoc(accountRef, {
      installments: updatedInstallments,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Marcar parcela como pendente (desfazer pagamento)
 */
export async function markInstallmentAsPending(
  accountId: string,
  installmentNumber: number
): Promise<void> {
  const accountRef = doc(db, 'accountsReceivable', accountId);
  const accountDoc = await getDoc(accountRef);
  
  if (!accountDoc.exists()) {
    throw new Error('Conta a receber não encontrada');
  }
  
  const account = accountDoc.data() as AccountReceivable;
  
  // Atualizar parcela
  const updatedInstallments = account.installments.map(inst => {
    if (inst.installmentNumber === installmentNumber) {
      // Remover campos de pagamento e preservar campos essenciais
      return {
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: inst.amount,
        status: 'pendente' as const,
      };
    }
    return inst;
  });
  
  // Calcular novo status geral
  const allPaid = updatedInstallments.every(inst => inst.status === 'paga');
  const somePaid = updatedInstallments.some(inst => inst.status === 'paga');
  const newStatus = allPaid ? 'paga' : (somePaid ? 'parcial' : 'pendente');
  
  await updateDoc(accountRef, {
    installments: updatedInstallments,
    status: newStatus,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Verificar parcelas vencidas e atualizar status
 */
export async function updateOverdueInstallments(): Promise<void> {
  const accounts = await getAllAccountsReceivable();
  const now = new Date();
  
  for (const account of accounts) {
    let hasChanges = false;
    const updatedInstallments = account.installments.map(inst => {
      if (inst.status === 'pendente') {
        const dueDate = inst.dueDate instanceof Timestamp 
          ? inst.dueDate.toDate() 
          : new Date(inst.dueDate);
        
        if (dueDate < now) {
          hasChanges = true;
          return { ...inst, status: 'vencida' as const };
        }
      }
      return inst;
    });
    
    if (hasChanges) {
      const accountRef = doc(db, 'accountsReceivable', account.id);
      await updateDoc(accountRef, {
        installments: updatedInstallments,
        updatedAt: Timestamp.now(),
      });
    }
  }
}

export async function getClientPendingBalance(clientId: string): Promise<{ total: number; overdue: number }> {
  const q = query(
    collection(db, 'accountsReceivable'),
    where('clientId', '==', clientId),
    where('status', 'in', ['pendente', 'parcial'])
  );
  
  const snapshot = await getDocs(q);
  let total = 0;
  let overdue = 0;
  const now = new Date();
  
  snapshot.docs.forEach(doc => {
    const account = doc.data() as AccountReceivable;
    account.installments.forEach(inst => {
      if (inst.status === 'pendente') {
        total += inst.amount;
        const dueDate = (inst.dueDate as any).toDate ? (inst.dueDate as any).toDate() : new Date(inst.dueDate as any);
        if (dueDate < now) {
          overdue += inst.amount;
        }
      }
    });
  });
  
  return { total, overdue };
}

/**
 * Cancelar conta a receber (quando venda é cancelada)
 */
export async function cancelAccountReceivable(
  saleId: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    // Buscar conta a receber pela venda
    const q = query(
      collection(db, 'accountsReceivable'),
      where('saleId', '==', saleId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Não há conta a receber para esta venda (pagamento à vista)
      return;
    }
    
    // Cancelar todas as contas encontradas (normalmente será apenas uma)
    for (const docSnapshot of snapshot.docs) {
      const accountRef = doc(db, 'accountsReceivable', docSnapshot.id);
      const account = docSnapshot.data() as AccountReceivable;
      
      // Cancelar todas as parcelas pendentes
      const updatedInstallments = account.installments.map(inst => {
        if (inst.status === 'pendente' || inst.status === 'vencida') {
          return {
            installmentNumber: inst.installmentNumber,
            dueDate: inst.dueDate,
            amount: inst.amount,
            status: 'cancelada' as const,
            cancelledAt: Timestamp.now(),
            cancelledBy: userId,
            cancelledByName: userName,
          };
        }
        return inst;
      });
      
      // Atualizar conta a receber
      await updateDoc(accountRef, {
        installments: updatedInstallments,
        status: 'cancelada',
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Erro ao cancelar conta a receber:', error);
    throw error;
  }
}

/**
 * Busca parcelas de contas a receber que vencem hoje
 * @returns Array de contas com parcelas vencendo hoje
 */
export async function getDueTodayReceivables(): Promise<{
  account: AccountReceivable;
  installment: Installment;
}[]> {
  const accounts = await getAllAccountsReceivable();
  
  // Usar data LOCAL para cálculo correto no Brasil
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const dueToday: {
    account: AccountReceivable;
    installment: Installment;
  }[] = [];
  
  accounts.forEach(account => {
    account.installments.forEach(installment => {
      // Apenas parcelas pendentes ou vencidas
      if (installment.status === 'pendente' || installment.status === 'vencida') {
        // Converter Timestamp do Firestore para Date
        let dueDate: Date;
        if (installment.dueDate instanceof Date) {
          dueDate = installment.dueDate;
        } else if ((installment.dueDate as any).toDate) {
          dueDate = (installment.dueDate as any).toDate();
        } else if ((installment.dueDate as any).seconds) {
          dueDate = new Date((installment.dueDate as any).seconds * 1000);
        } else {
          dueDate = new Date();
        }
        
        // Verificar se vence hoje
        const dueDateMs = dueDate.getTime();
        if (dueDateMs >= todayStart.getTime() && dueDateMs <= todayEnd.getTime()) {
          dueToday.push({
            account,
            installment,
          });
        }
      }
    });
  });
  
  return dueToday;
}
