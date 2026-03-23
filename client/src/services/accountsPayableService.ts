import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { prepareForFirestore } from '@/lib/firestoreUtils';

export interface AccountPayable {
  id: string;
  description: string;
  category: 'agua' | 'telefone' | 'energia' | 'fornecedor' | 'aluguel' | 'salario' | 'imposto' | 'outros';
  supplierId?: string;
  supplierName?: string;
  totalAmount: number;
  installments: PayableInstallment[];
  status: 'pendente' | 'paga' | 'parcial';
  createdAt: Date | Timestamp;
  createdBy: string;
  createdByName: string;
}

export interface PayableInstallment {
  installmentNumber: number;
  dueDate: Date | Timestamp;
  amount: number;
  status: 'pendente' | 'paga';
  paidAt?: Date | Timestamp;
  paidBy?: string;
  paidByName?: string;
  paymentMethod?: string;
  originalAmount?: number;
  partialPayment?: boolean;
  previousBalance?: number;
}

export async function createAccountPayable(
  description: string,
  category: string,
  totalAmount: number,
  installmentCount: number,
  firstDueDate: Date,
  userId: string,
  userName: string,
  supplierId?: string,
  supplierName?: string
): Promise<string> {
  const installments: PayableInstallment[] = [];
  const installmentAmount = totalAmount / installmentCount;

  for (let i = 1; i <= installmentCount; i++) {
    // Criar data de vencimento com meia-noite LOCAL (não UTC)
    const baseDate = new Date(firstDueDate);
    baseDate.setMonth(baseDate.getMonth() + (i - 1));
    
    // Garantir que a data seja meia-noite LOCAL
    const dueDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      12, 0, 0, 0  // Usar meio-dia para evitar problemas de timezone
    );

    installments.push({
      installmentNumber: i,
      dueDate: Timestamp.fromDate(dueDate),
      amount: installmentAmount,
      status: 'pendente',
    });
  }

  const accountData = prepareForFirestore({
    description,
    category,
    supplierId,
    supplierName,
    totalAmount,
    installments,
    status: 'pendente',
    createdAt: Timestamp.now(),
    createdBy: userId,
    createdByName: userName,
  });

  const docRef = await addDoc(collection(db, 'accountsPayable'), accountData);
  return docRef.id;
}

export async function getAccountsPayable(limitCount: number = 100): Promise<AccountPayable[]> {
  // Otimização: Limitar quantidade de documentos carregados
  const q = query(
    collection(db, 'accountsPayable'), 
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AccountPayable));
}

function getAccountStatus(installments: PayableInstallment[]): 'pendente' | 'paga' | 'parcial' {
  const paidCount = installments.filter(i => i.status === 'paga').length;
  return paidCount === installments.length ? 'paga' : paidCount > 0 ? 'parcial' : 'pendente';
}

function normalizeDueDate(dueDate: Date | Timestamp): Date {
  if (dueDate instanceof Date) return dueDate;
  if ((dueDate as any)?.toDate) return (dueDate as any).toDate();
  if ((dueDate as any)?.seconds) return new Date((dueDate as any).seconds * 1000);
  return new Date();
}

function buildNextInstallmentDueDate(baseDueDate: Date | Timestamp): Timestamp {
  const base = normalizeDueDate(baseDueDate);
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);

  return Timestamp.fromDate(
    new Date(
      next.getFullYear(),
      next.getMonth(),
      next.getDate(),
      12, 0, 0, 0
    )
  );
}

export async function markInstallmentAsPaid(
  accountId: string,
  installmentNumber: number,
  paymentMethod: string,
  userId: string,
  userName: string
): Promise<void> {
  const accountRef = doc(db, 'accountsPayable', accountId);
  const accountDoc = await getDoc(accountRef);

  if (!accountDoc.exists()) {
    throw new Error('Conta não encontrada');
  }

  const account = accountDoc.data() as AccountPayable;

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
        paymentMethod,
      };
    }
    return inst;
  });

  await updateDoc(accountRef, {
    installments: updatedInstallments,
    status: getAccountStatus(updatedInstallments),
  });
}

export async function processPartialPaymentAccountPayable(
  accountId: string,
  installmentNumber: number,
  paidAmount: number,
  paymentMethod: string,
  userId: string,
  userName: string
): Promise<{ remainingAmount: number; createdNewInstallment: boolean }> {
  const accountRef = doc(db, 'accountsPayable', accountId);
  const accountDoc = await getDoc(accountRef);

  if (!accountDoc.exists()) {
    throw new Error('Conta não encontrada');
  }

  const account = accountDoc.data() as AccountPayable;
  const installment = account.installments.find(i => i.installmentNumber === installmentNumber);

  if (!installment) {
    throw new Error('Parcela não encontrada');
  }

  if (paidAmount <= 0) {
    throw new Error('O valor pago deve ser maior que zero');
  }

  if (paidAmount > installment.amount) {
    throw new Error('O valor pago não pode ser maior que o valor da parcela');
  }

  if (paidAmount === installment.amount) {
    await markInstallmentAsPaid(accountId, installmentNumber, paymentMethod, userId, userName);
    return { remainingAmount: 0, createdNewInstallment: false };
  }

  const remainingAmount = Number((installment.amount - paidAmount).toFixed(2));
  const updatedInstallments = account.installments.map(inst => {
    if (inst.installmentNumber === installmentNumber) {
      return {
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: paidAmount,
        originalAmount: installment.amount,
        status: 'paga' as const,
        paidAt: Timestamp.now(),
        paidBy: userId,
        paidByName: userName,
        paymentMethod,
        partialPayment: true,
      };
    }

    if (inst.installmentNumber === installmentNumber + 1 && inst.status !== 'paga') {
      return {
        ...inst,
        amount: Number((inst.amount + remainingAmount).toFixed(2)),
        previousBalance: remainingAmount,
      };
    }

    return inst;
  });

  const hasNextPendingInstallment = account.installments.some(
    inst => inst.installmentNumber === installmentNumber + 1 && inst.status !== 'paga'
  );

  let createdNewInstallment = false;

  if (!hasNextPendingInstallment) {
    const highestInstallmentNumber = Math.max(...account.installments.map(inst => inst.installmentNumber));
    updatedInstallments.push({
      installmentNumber: highestInstallmentNumber + 1,
      dueDate: buildNextInstallmentDueDate(installment.dueDate),
      amount: remainingAmount,
      status: 'pendente',
      previousBalance: remainingAmount,
    });
    createdNewInstallment = true;
  }

  updatedInstallments.sort((a, b) => a.installmentNumber - b.installmentNumber);

  await updateDoc(accountRef, {
    installments: updatedInstallments,
    status: getAccountStatus(updatedInstallments),
  });

  return { remainingAmount, createdNewInstallment };
}

export async function deleteAccountPayable(accountId: string): Promise<void> {
  const accountRef = doc(db, 'accountsPayable', accountId);
  await deleteDoc(accountRef);
}

/**
 * Busca contas a pagar com vencimento nos próximos dias
 * @param daysAhead - Número de dias à frente para buscar (padrão: 3)
 * @returns Array de contas com parcelas próximas ao vencimento
 */
export async function getUpcomingDueDates(daysAhead: number = 3): Promise<{
  account: AccountPayable;
  installment: PayableInstallment;
  daysUntilDue: number;
}[]> {
  const accounts = await getAccountsPayable();
  
  // Usar data LOCAL (não UTC) para cálculo correto no Brasil
  const now = new Date();
  // Criar data de hoje à meia-noite LOCAL
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  
  // Data limite (daysAhead dias à frente)
  const futureLimit = new Date(todayStart);
  futureLimit.setDate(futureLimit.getDate() + daysAhead);
  const futureLimitMs = futureLimit.getTime();
  
  const upcoming: {
    account: AccountPayable;
    installment: PayableInstallment;
    daysUntilDue: number;
  }[] = [];
  
  accounts.forEach(account => {
    account.installments.forEach(installment => {
      // Apenas parcelas pendentes
      if (installment.status === 'pendente') {
        // Converter Timestamp do Firestore para Date
        let dueDate: Date;
        if (installment.dueDate instanceof Date) {
          dueDate = installment.dueDate;
        } else if ((installment.dueDate as any).toDate) {
          dueDate = (installment.dueDate as any).toDate();
        } else if ((installment.dueDate as any).seconds) {
          // Firestore Timestamp serializado
          dueDate = new Date((installment.dueDate as any).seconds * 1000);
        } else {
          // Fallback
          dueDate = new Date();
        }
        
        // Normalizar data de vencimento para meia-noite LOCAL
        const dueDateStart = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          0, 0, 0, 0
        );
        const dueDateMs = dueDateStart.getTime();
        
        // Verifica se vence entre hoje e daysAhead dias
        if (dueDateMs >= todayMs && dueDateMs <= futureLimitMs) {
          // Calcular diferença em dias
          const diffMs = dueDateMs - todayMs;
          const daysUntilDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          upcoming.push({
            account,
            installment,
            daysUntilDue,
          });
        }
      }
    });
  });
  
  // Ordenar por dias até vencimento (mais urgente primeiro)
  return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
