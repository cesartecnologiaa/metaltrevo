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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { prepareForFirestore } from '@/lib/firestoreUtils';
import { User, UserRole } from '@/types';

/**
 * Buscar todos os usuários
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

/**
 * Buscar usuários ativos
 */
export async function getActiveUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('active', '==', true));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
  } catch (error) {
    console.error('Error fetching active users:', error);
    return [];
  }
}

/**
 * Buscar usuário por UID do Firebase Auth
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    console.error('Error fetching user by UID:', error);
    return null;
  }
}

/**
 * Criar novo usuário
 */
export async function createUser(
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const usersRef = collection(db, 'users');
  
  // Verificar se já existe usuário com este UID
  const existing = await getUserByUid(userData.uid);
  if (existing) {
    throw new Error('Usuário já cadastrado com este UID');
  }
  
  const newUser = {
    ...userData,
    active: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(usersRef, newUser);
  return docRef.id;
}

/**
 * Atualizar usuário
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'uid' | 'createdAt' | 'updatedBy'>>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, prepareForFirestore({
    ...updates,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * Desativar usuário
 */
export async function deactivateUser(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, prepareForFirestore({
    active: false,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * Reativar usuário
 */
export async function reactivateUser(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, prepareForFirestore({
    active: true,
    updatedAt: Timestamp.now(),
  }));
}

/**
 * Verificar se usuário é admin
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const user = await getUserByUid(uid);
  return user?.role === 'admin' && user?.active === true;
}

/**
 * Excluir usuário
 */
export async function deleteUser(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

/**
 * Verificar se usuário tem permissão
 */
export async function hasPermission(uid: string, requiredRole: UserRole): Promise<boolean> {
  const user = await getUserByUid(uid);
  
  if (!user || !user.active) {
    return false;
  }
  
  // Admin tem todas as permissões
  if (user.role === 'admin') {
    return true;
  }
  
  // Verificar role específico
  return user.role === requiredRole;
}
