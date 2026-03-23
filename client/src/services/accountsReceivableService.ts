import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AccountReceivable, Installment } from '@/types';

type PendingBalance = { total: number; overdue: number };

function normalizeInstallment(inst: Installment): Installment & Record<string, any> {
  return {
    ...inst,
    amount: Number(inst.amount || 0),
  };
}

function getNextMonthDate(base: Date) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

function calcAccountStatus(installments: Installment[]) {
  const active = installments.filter(inst => inst.status !== 'cancelada');
  const allPaid = active.length > 0 && active.every(inst => inst.status === 'paga');
  const somePaid = active.some(inst => inst.status === 'paga');
  if (allPaid) return 'paga' as const;
  if (somePaid) return 'parcial' as const;
  return 'pendente' as const;
}

function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

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
  const safeInstallments = Math.max(1, Number(installmentCount || 1));
  const installmentAmount = Number((totalAmount / safeInstallments).toFixed(2));
  const installments: Installment[] = [];

  for (let i = 1; i <= safeInstallments; i++) {
    const dueBase = new Date();
    dueBase.setDate(dueBase.getDate() + 30 * i);
    const dueDate = new Date(
      dueBase.getFullYear(),
      dueBase.getMonth(),
      dueBase.getDate(),
      12, 0, 0, 0
    );

    installments.push({
      installmentNumber: i,
      dueDate: Timestamp.fromDate(dueDate),
      amount: i === safeInstallments
        ? Number((totalAmount - installmentAmount * (safeInstallments - 1)).toFixed(2))
        : installmentAmount,
      status: 'pendente',
    });
  }

  const payload: Omit<AccountReceivable, 'id'> & Record<string, any> = {
    saleId,
    saleNumber,
    clientId,
    clientName,
    clientDocument,
    totalAmount: Number(totalAmount || 0),
    installments,
    status: 'pendente',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(accountsRef, payload);
  return docRef.id;
}

export async function getAllAccountsReceivable(): Promise<AccountReceivable[]> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const snapshot = await getDocs(accountsRef);

    const accounts = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data(),
    })) as AccountReceivable[];

    return accounts.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt as any);
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt as any);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching accounts receivable:', error);
    return [];
  }
}

export async function getAccountsReceivableByStatus(
  status: 'pendente' | 'paga' | 'parcial'
): Promise<AccountReceivable[]> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const q = query(accountsRef, where('status', '==', status));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(item => ({
      id: item.id,
      ...item.data(),
    })) as AccountReceivable[];
  } catch (error) {
    console.error('Error fetching accounts by status:', error);
    return [];
  }
}

export async function getAccountReceivableBySaleId(saleId: string): Promise<AccountReceivable | null> {
  try {
    const accountsRef = collection(db, 'accountsReceivable');
    const q = query(accountsRef, where('saleId', '==', saleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const item = snapshot.docs[0];
    return {
      id: item.id,
      ...item.data(),
    } as AccountReceivable;
  } catch (error) {
    console.error('Error fetching account by sale ID:', error);
    return null;
  }
}

export async function registerInstallmentPayment(
  accountId: string,
  installmentNumber: number,
  amountPaid: number,
  userId: string,
  userName: string
): Promise<{ success: true; totalOpen: number; remainingGenerated?: number; excessApplied?: number }> {
  if (!amountPaid || amountPaid <= 0) {
    throw new Error('Informe um valor válido para o pagamento.');
  }

  const accountRef = doc(db, 'accountsReceivable', accountId);
  const accountSnap = await getDoc(accountRef);

  if (!accountSnap.exists()) {
    throw new Error('Conta a receber não encontrada.');
  }

  const account = accountSnap.data() as AccountReceivable & Record<string, any>;
  const now = Timestamp.now();
  const installments = [...(account.installments || [])]
    .map(normalizeInstallment)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const currentIndex = installments.findIndex(
    inst => inst.installmentNumber === installmentNumber && inst.status !== 'paga' && inst.status !== 'cancelada'
  );

  if (currentIndex === -1) {
    throw new Error('Parcela não encontrada ou já quitada.');
  }

  const current = installments[currentIndex];
  const installmentAmount = Number(current.amount || 0);
  const received = Number(Number(amountPaid).toFixed(2));

  let excessApplied = 0;
  let remainingGenerated = 0;
  let carry = Number((installmentAmount - received).toFixed(2));

  installments[currentIndex] = {
    ...current,
    originalAmount: current.originalAmount ?? installmentAmount,
    paidAmount: received,
    amount: installmentAmount,
    status: 'paga',
    paidAt: now,
    paidBy: userId || '',
    paidByName: userName || 'Usuário',
  } as any;

  for (let i = currentIndex + 1; i < installments.length; i++) {
    const next = installments[i] as any;
    if (next.status === 'paga' || next.status === 'cancelada') continue;
    if (carry === 0) break;

    const nextAmount = Number(next.amount || 0);

    if (carry > 0) {
      installments[i] = {
        ...next,
        amount: Number((nextAmount + carry).toFixed(2)),
        previousBalance: Number((Number(next.previousBalance || 0) + carry).toFixed(2)),
        updatedAt: now,
      } as any;
      remainingGenerated = carry;
      carry = 0;
      break;
    }

    const credit = Math.abs(carry);
    if (credit >= nextAmount) {
      installments[i] = {
        ...next,
        originalAmount: next.originalAmount ?? nextAmount,
        paidAmount: nextAmount,
        amount: nextAmount,
        status: 'paga',
        paidAt: now,
        paidBy: userId || '',
        paidByName: userName || 'Usuário',
        advancedSettlement: true,
      } as any;
      excessApplied += nextAmount;
      carry = Number((-(credit - nextAmount)).toFixed(2));
    } else {
      installments[i] = {
        ...next,
        amount: Number((nextAmount - credit).toFixed(2)),
        discountFromPrevious: Number((Number(next.discountFromPrevious || 0) + credit).toFixed(2)),
        updatedAt: now,
      } as any;
      excessApplied += credit;
      carry = 0;
      break;
    }
  }

  if (carry > 0) {
    const lastActive = [...installments].reverse().find(inst => inst.status !== 'cancelada') || current;
    const nextDueDate = getNextMonthDate(toDate(lastActive.dueDate));
    const nextInstallmentNumber = Math.max(...installments.map(inst => Number(inst.installmentNumber || 0))) + 1;

    installments.push({
      installmentNumber: nextInstallmentNumber,
      dueDate: Timestamp.fromDate(nextDueDate),
      amount: Number(carry.toFixed(2)),
      status: 'pendente',
      createdAt: now,
      updatedAt: now,
      observation: `Gerada automaticamente pelo saldo remanescente da parcela ${installmentNumber}`,
      previousBalance: Number(carry.toFixed(2)),
    } as any);

    remainingGenerated = carry;
    carry = 0;
  }

  const totalOpen = Number(
    installments
      .filter(inst => inst.status !== 'paga' && inst.status !== 'cancelada')
      .reduce((sum, inst) => sum + Number(inst.amount || 0), 0)
      .toFixed(2)
  );

  const safeInstallments = installments.map(inst => removeUndefinedFields(inst as any));

  await updateDoc(accountRef, {
    installments: safeInstallments,
    totalOpen,
    status: calcAccountStatus(safeInstallments as any),
    updatedAt: now,
  } as any);

  return {
    success: true,
    totalOpen,
    remainingGenerated: remainingGenerated || undefined,
    excessApplied: excessApplied || undefined,
  };
}

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
  const installment = account.installments.find(inst => inst.installmentNumber === installmentNumber);
  if (!installment) throw new Error('Parcela não encontrada');

  await registerInstallmentPayment(accountId, installmentNumber, Number(installment.amount || 0), userId, userName);
}

export async function processPartialPayment(
  accountId: string,
  installmentNumber: number,
  paidAmount: number,
  userId: string,
  userName: string
): Promise<void> {
  await registerInstallmentPayment(accountId, installmentNumber, paidAmount, userId, userName);
}

export async function markInstallmentAsPending(
  accountId: string,
  installmentNumber: number
): Promise<void> {
  const accountRef = doc(db, 'accountsReceivable', accountId);
  const accountDoc = await getDoc(accountRef);

  if (!accountDoc.exists()) {
    throw new Error('Conta a receber não encontrada');
  }

  const account = accountDoc.data() as AccountReceivable & Record<string, any>;

  const updatedInstallments = (account.installments || []).map((inst: any) => {
    if (inst.installmentNumber === installmentNumber) {
      return {
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: Number(inst.originalAmount ?? inst.amount ?? 0),
        status: 'pendente' as const,
      };
    }
    return inst;
  });

  await updateDoc(accountRef, {
    installments: updatedInstallments,
    status: calcAccountStatus(updatedInstallments),
    updatedAt: Timestamp.now(),
  } as any);
}

export async function updateOverdueInstallments(): Promise<void> {
  const accounts = await getAllAccountsReceivable();
  const now = new Date();

  for (const account of accounts) {
    let hasChanges = false;
    const updatedInstallments = account.installments.map(inst => {
      if (inst.status === 'pendente') {
        const dueDate = inst.dueDate instanceof Timestamp ? inst.dueDate.toDate() : new Date(inst.dueDate as any);
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
      } as any);
    }
  }
}

export async function getClientPendingBalance(clientId: string): Promise<PendingBalance> {
  const q = query(
    collection(db, 'accountsReceivable'),
    where('clientId', '==', clientId),
    where('status', 'in', ['pendente', 'parcial'])
  );

  const snapshot = await getDocs(q);
  let total = 0;
  let overdue = 0;
  const now = new Date();

  snapshot.docs.forEach(item => {
    const account = item.data() as AccountReceivable;
    account.installments.forEach(inst => {
      if (inst.status === 'pendente' || inst.status === 'vencida') {
        total += Number(inst.amount || 0);
        const dueDate = toDate(inst.dueDate);
        if (dueDate < now) overdue += Number(inst.amount || 0);
      }
    });
  });

  return { total, overdue };
}

export async function getClientPendingInstallments(clientId: string): Promise<Array<{
  accountId: string;
  saleId: string;
  saleNumber: string;
  clientName?: string;
  installment: Installment;
}>> {
  const q = query(
    collection(db, 'accountsReceivable'),
    where('clientId', '==', clientId),
    where('status', 'in', ['pendente', 'parcial'])
  );

  const snapshot = await getDocs(q);
  const items: Array<{
    accountId: string;
    saleId: string;
    saleNumber: string;
    clientName?: string;
    installment: Installment;
  }> = [];

  snapshot.docs.forEach(item => {
    const account = item.data() as AccountReceivable;
    (account.installments || []).forEach(inst => {
      if (inst.status !== 'paga' && inst.status !== 'cancelada') {
        items.push({
          accountId: item.id,
          saleId: account.saleId,
          saleNumber: account.saleNumber,
          clientName: account.clientName,
          installment: inst,
        });
      }
    });
  });

  return items.sort((a, b) => toDate(a.installment.dueDate).getTime() - toDate(b.installment.dueDate).getTime());
}

export async function cancelAccountReceivable(
  saleId: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const q = query(collection(db, 'accountsReceivable'), where('saleId', '==', saleId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    for (const docSnapshot of snapshot.docs) {
      const accountRef = doc(db, 'accountsReceivable', docSnapshot.id);
      const account = docSnapshot.data() as AccountReceivable;

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
          } as any;
        }
        return inst;
      });

      await updateDoc(accountRef, {
        installments: updatedInstallments,
        status: 'cancelada',
        updatedAt: Timestamp.now(),
      } as any);
    }
  } catch (error) {
    console.error('Erro ao cancelar conta a receber:', error);
    throw error;
  }
}

export async function getDueTodayReceivables(): Promise<Array<{ account: AccountReceivable; installment: Installment }>> {
  const accounts = await getAllAccountsReceivable();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const dueToday: Array<{ account: AccountReceivable; installment: Installment }> = [];

  accounts.forEach(account => {
    account.installments.forEach(installment => {
      if (installment.status === 'pendente' || installment.status === 'vencida') {
        const dueDate = toDate(installment.dueDate);
        if (dueDate.getTime() >= todayStart.getTime() && dueDate.getTime() <= todayEnd.getTime()) {
          dueToday.push({ account, installment });
        }
      }
    });
  });

  return dueToday;
}


export type TodayReceivablePayment = {
  accountId: string;
  saleId?: string;
  saleNumber?: string;
  clientId?: string;
  clientName?: string;
  installmentNumber: number;
  originalAmount: number;
  paidAmount: number;
  paidAt: any;
  paidByUserId?: string;
  paidByUserName?: string;
};

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export async function getTodayReceivablePayments(): Promise<TodayReceivablePayment[]> {
  const accounts = await getAllAccountsReceivable();
  const now = new Date();
  const payments: TodayReceivablePayment[] = [];

  accounts.forEach((account) => {
    (account.installments || []).forEach((inst: any) => {
      if (inst.status === 'paga' && inst.paidAt) {
        const paidDate = toDate(inst.paidAt);
        if (isSameDay(paidDate, now)) {
          payments.push({
            accountId: account.id,
            saleId: (account as any).saleId,
            saleNumber: account.saleNumber,
            clientId: (account as any).clientId,
            clientName: (account as any).clientName,
            installmentNumber: Number(inst.installmentNumber || 0),
            originalAmount: Number(inst.originalAmount ?? inst.amount ?? 0),
            paidAmount: Number(inst.paidAmount ?? inst.amount ?? 0),
            paidAt: inst.paidAt,
            paidByUserId: inst.paidBy,
            paidByUserName: inst.paidByName,
          });
        }
      }
    });
  });

  return payments.sort((a, b) => toDate(b.paidAt).getTime() - toDate(a.paidAt).getTime());
}
