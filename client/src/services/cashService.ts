import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CashRegister {
  id?: string;
  openedAt: Date;
  openedBy: string;
  openedByName: string;
  initialBalance: number;
  closedAt?: Date;
  closedBy?: string;
  closedByName?: string;
  finalBalance?: number;
  totalSales?: number;
  totalWithdrawals?: number;
  status: 'open' | 'closed';
}

export interface CashWithdrawal {
  id?: string;
  cashRegisterId: string;
  amount: number;
  reason: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}

export const cashService = {
  // Abrir caixa
  async openCashRegister(initialBalance: number, userId: string, userName: string): Promise<string> {
    const cashRegister: Omit<CashRegister, 'id'> = {
      openedAt: new Date(),
      openedBy: userId,
      openedByName: userName,
      initialBalance,
      status: 'open',
    };

    const docRef = await addDoc(collection(db, 'cashRegisters'), {
      ...cashRegister,
      openedAt: Timestamp.fromDate(cashRegister.openedAt),
    });

    return docRef.id;
  },

  // Fechar caixa
  async closeCashRegister(
    cashRegisterId: string,
    finalBalance: number,
    totalSales: number,
    totalWithdrawals: number,
    userId: string,
    userName: string
  ): Promise<void> {
    const docRef = doc(db, 'cashRegisters', cashRegisterId);
    await updateDoc(docRef, {
      closedAt: Timestamp.fromDate(new Date()),
      closedBy: userId,
      closedByName: userName,
      finalBalance,
      totalSales,
      totalWithdrawals,
      status: 'closed',
    });
  },

  // Registrar sangria
  async addWithdrawal(
    cashRegisterId: string,
    amount: number,
    reason: string,
    userId: string,
    userName: string
  ): Promise<string> {
    const withdrawal: Omit<CashWithdrawal, 'id'> = {
      cashRegisterId,
      amount,
      reason,
      createdAt: new Date(),
      createdBy: userId,
      createdByName: userName,
    };

    const docRef = await addDoc(collection(db, 'cashWithdrawals'), {
      ...withdrawal,
      createdAt: Timestamp.fromDate(withdrawal.createdAt),
    });

    return docRef.id;
  },

  // Buscar caixa aberto
  async getOpenCashRegister(): Promise<CashRegister | null> {
    const q = query(
      collection(db, 'cashRegisters'),
      where('status', '==', 'open'),
      orderBy('openedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      openedAt: data.openedAt.toDate(),
      closedAt: data.closedAt?.toDate(),
    } as CashRegister;
  },

  // Buscar sangrias do caixa
  async getWithdrawals(cashRegisterId: string): Promise<CashWithdrawal[]> {
    const q = query(
      collection(db, 'cashWithdrawals'),
      where('cashRegisterId', '==', cashRegisterId)
      // orderBy removido para evitar necessidade de índice composto
    );

    const snapshot = await getDocs(q);
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    })) as CashWithdrawal[];
    
    // Ordenar no código JavaScript ao invés do Firestore
    return withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Buscar histórico de caixas fechados
  async getClosedCashRegisters(startDate?: Date, endDate?: Date): Promise<CashRegister[]> {
    let q = query(
      collection(db, 'cashRegisters'),
      where('status', '==', 'closed')
    );

    // Se houver filtro de data, aplicar
    if (startDate) {
      q = query(q, where('closedAt', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      q = query(q, where('closedAt', '<=', Timestamp.fromDate(endOfDay)));
    }

    const snapshot = await getDocs(q);
    const cashRegisters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      openedAt: doc.data().openedAt.toDate(),
      closedAt: doc.data().closedAt?.toDate(),
    })) as CashRegister[];

    // Ordenar por data de fechamento (mais recente primeiro)
    return cashRegisters.sort((a, b) => {
      if (!a.closedAt || !b.closedAt) return 0;
      return b.closedAt.getTime() - a.closedAt.getTime();
    });
  },

  // Buscar vendas do dia
  async getTodaySales(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'sales'),
      where('createdAt', '>=', Timestamp.fromDate(today)),
      where('createdAt', '<=', Timestamp.fromDate(todayEnd))
      // Filtro de status removido para evitar índice composto
    );

    const snapshot = await getDocs(q);
    const allSales = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    })) as any[];
    
    // Filtrar apenas vendas concluídas no código JavaScript
    return allSales.filter((sale: any) => sale.status === 'concluida');
  },
};
