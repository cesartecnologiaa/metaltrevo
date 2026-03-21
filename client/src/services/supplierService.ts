import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { prepareForFirestore } from '@/lib/firestoreUtils';
import { Supplier } from '@/types';

/**
 * Buscar todos os fornecedores ativos
 */
export async function getActiveSuppliers(): Promise<Supplier[]> {
  try {
    const suppliersRef = collection(db, 'suppliers');
    const q = query(
      suppliersRef, 
      where('active', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Supplier[];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

/**
 * Buscar todos os fornecedores (ativos e inativos)
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  try {
    const suppliersRef = collection(db, 'suppliers');
    const q = query(suppliersRef, orderBy('name', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Supplier[];
  } catch (error) {
    console.error('Error fetching all suppliers:', error);
    return [];
  }
}

/**
 * Buscar fornecedor por ID
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    const supplierDoc = await getDoc(supplierRef);
    
    if (supplierDoc.exists()) {
      return {
        id: supplierDoc.id,
        ...supplierDoc.data(),
      } as Supplier;
    }
    return null;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return null;
  }
}

/**
 * Buscar fornecedor por CNPJ
 */
export async function getSupplierByCnpj(cnpj: string): Promise<Supplier | null> {
  try {
    const suppliersRef = collection(db, 'suppliers');
    const q = query(suppliersRef, where('cnpj', '==', cnpj));
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Supplier;
    }
    return null;
  } catch (error) {
    console.error('Error fetching supplier by CNPJ:', error);
    return null;
  }
}

/**
 * Criar novo fornecedor
 */
export async function createSupplier(
  supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const suppliersRef = collection(db, 'suppliers');
    
    const newSupplier = {
      ...supplierData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(suppliersRef, newSupplier);
    return docRef.id;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
}

/**
 * Atualizar fornecedor
 */
export async function updateSupplier(
  supplierId: string,
  supplierData: Partial<Supplier>
): Promise<void> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await updateDoc(supplierRef, prepareForFirestore({
      ...supplierData,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
}

/**
 * Desativar fornecedor
 */
export async function deactivateSupplier(supplierId: string): Promise<void> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await updateDoc(supplierRef, prepareForFirestore({
      active: false,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error deactivating supplier:', error);
    throw error;
  }
}

/**
 * Reativar fornecedor
 */
export async function reactivateSupplier(supplierId: string): Promise<void> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await updateDoc(supplierRef, prepareForFirestore({
      active: true,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error reactivating supplier:', error);
    throw error;
  }
}

/**
 * Excluir fornecedor permanentemente
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await deleteDoc(supplierRef);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
}
