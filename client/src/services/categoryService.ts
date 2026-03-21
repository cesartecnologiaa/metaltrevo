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
import { Category } from '@/types';

/**
 * Buscar todas as categorias ativas
 */
export async function getActiveCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(
      categoriesRef, 
      where('active', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Buscar todas as categorias (ativas e inativas)
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('name', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.error('Error fetching all categories:', error);
    return [];
  }
}

/**
 * Criar nova categoria
 */
export async function createCategory(
  name: string,
  description?: string
): Promise<string> {
  try {
    const categoriesRef = collection(db, 'categories');
    
    const newCategory = {
      name,
      description: description || '',
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Atualizar categoria
 */
export async function updateCategory(
  categoryId: string,
  data: Partial<Category>
): Promise<void> {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, prepareForFirestore({
      ...data,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Desativar categoria
 */
export async function deactivateCategory(categoryId: string): Promise<void> {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, prepareForFirestore({
      active: false,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error deactivating category:', error);
    throw error;
  }
}

/**
 * Reativar categoria
 */
export async function reactivateCategory(categoryId: string): Promise<void> {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, prepareForFirestore({
      active: true,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error reactivating category:', error);
    throw error;
  }
}

/**
 * Excluir categoria permanentemente
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
