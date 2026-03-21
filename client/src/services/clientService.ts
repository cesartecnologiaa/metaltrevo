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
import { Client } from '@/types';

/**
 * Buscar todos os clientes ativos
 */
export async function getActiveClients(): Promise<Client[]> {
  try {
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, where('active', '==', true));
    
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
    
    // Ordenar no código ao invés de usar orderBy no Firestore
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

/**
 * Buscar todos os clientes (ativos e inativos)
 */
export async function getAllClients(): Promise<Client[]> {
  try {
    const clientsRef = collection(db, 'clients');
    const snapshot = await getDocs(clientsRef);
    
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
    
    // Ordenar no código ao invés de usar orderBy no Firestore
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching all clients:', error);
    return [];
  }
}

/**
 * Buscar cliente por ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const clientRef = doc(db, 'clients', clientId);
    const clientDoc = await getDoc(clientRef);
    
    if (clientDoc.exists()) {
      return {
        id: clientDoc.id,
        ...clientDoc.data(),
      } as Client;
    }
    return null;
  } catch (error) {
    console.error('Error fetching client:', error);
    return null;
  }
}

/**
 * Buscar cliente por CPF/CNPJ
 */
export async function getClientByCpfCnpj(cpfCnpj: string): Promise<Client | null> {
  try {
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, where('cpfCnpj', '==', cpfCnpj));
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Client;
    }
    return null;
  } catch (error) {
    console.error('Error fetching client by CPF/CNPJ:', error);
    return null;
  }
}

/**
 * Criar novo cliente
 */
/**
 * Gerar código de cliente de 4 dígitos
 */
async function generateClientCode(): Promise<string> {
  const clientsRef = collection(db, 'clients');
  const snapshot = await getDocs(clientsRef);
  
  // Gerar código sequencial baseado no número de clientes
  const nextNumber = snapshot.size + 1;
  return String(nextNumber).padStart(4, '0');
}

export async function createClient(
  clientData: Omit<Client, 'id' | 'code' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const clientsRef = collection(db, 'clients');
    
    // Gerar código automaticamente
    const code = await generateClientCode();
    
    const newClient = {
      ...clientData,
      code,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(clientsRef, newClient);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

/**
 * Atualizar cliente
 */
export async function updateClient(
  clientId: string,
  clientData: Partial<Client>
): Promise<void> {
  try {
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, prepareForFirestore({
      ...clientData,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

/**
 * Desativar cliente
 */
export async function deactivateClient(clientId: string): Promise<void> {
  try {
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, prepareForFirestore({
      active: false,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error deactivating client:', error);
    throw error;
  }
}

/**
 * Reativar cliente
 */
export async function reactivateClient(clientId: string): Promise<void> {
  try {
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, prepareForFirestore({
      active: true,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error reactivating client:', error);
    throw error;
  }
}

/**
 * Excluir cliente permanentemente
 */
export async function deleteClient(clientId: string): Promise<void> {
  try {
    const clientRef = doc(db, 'clients', clientId);
    await deleteDoc(clientRef);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}
