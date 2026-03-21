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
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { prepareForFirestore } from '@/lib/firestoreUtils';
import { Product } from '@/types';

/**
 * Gerar próximo código de produto (formato MT0001, MT0002, etc.)
 */
export async function generateNextProductCode(): Promise<string> {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    // Encontrar o maior número de código existente
    let maxNumber = 0;
    snapshot.docs.forEach(doc => {
      const product = doc.data() as Product;
      const match = product.code.match(/^MT(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    // Próximo número
    const nextNumber = maxNumber + 1;
    return `MT${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating product code:', error);
    // Fallback para código aleatório
    return `MT${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  }
}

/**
 * Buscar todos os produtos ativos
 */
export async function getActiveProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef, 
      where('active', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Buscar produto por ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId));
    
    if (!productDoc.exists()) {
      return null;
    }
    
    return {
      id: productDoc.id,
      ...productDoc.data(),
    } as Product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Buscar produto por código de barras
 */
export async function getProductByCode(code: string): Promise<Product | null> {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('code', '==', code));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Product;
  } catch (error) {
    console.error('Error fetching product by code:', error);
    return null;
  }
}

/**
 * Atualizar estoque do produto
 */
export async function updateProductStock(
  productId: string, 
  newStock: number
): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, prepareForFirestore({
      currentStock: newStock,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
}

/**
 * Verificar se há estoque suficiente
 */
export async function checkStockAvailability(
  productId: string, 
  quantity: number
): Promise<{ available: boolean; currentStock: number }> {
  try {
    const product = await getProductById(productId);
    
    if (!product) {
      return { available: false, currentStock: 0 };
    }
    
    return {
      available: product.currentStock >= quantity,
      currentStock: product.currentStock,
    };
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return { available: false, currentStock: 0 };
  }
}

/**
 * Buscar produtos com estoque baixo
 */
export async function getLowStockProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
    
    // Filtrar produtos com estoque abaixo do mínimo
    return products.filter(p => p.active && p.currentStock <= p.minStock);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }
}

/**
 * Criar novo produto
 */
export async function createProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const productsRef = collection(db, 'products');
    
    // Remover campos undefined para evitar erro no Firestore
    const cleanData = Object.fromEntries(
      Object.entries(productData).filter(([_, value]) => value !== undefined)
    );
    
    const newProduct = {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(productsRef, newProduct);
    return docRef.id;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Atualizar produto
 */
export async function updateProduct(
  productId: string,
  productData: Partial<Product>
): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    
    // Remover campos undefined para evitar erro no Firestore
    const cleanData = Object.fromEntries(
      Object.entries(productData).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(productRef, prepareForFirestore({
      ...cleanData,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Desativar produto (exclusão lógica)
 */
export async function deactivateProduct(productId: string): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, prepareForFirestore({
      active: false,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error deactivating product:', error);
    throw error;
  }
}

/**
 * Reativar produto
 */
export async function reactivateProduct(productId: string): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, prepareForFirestore({
      active: true,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    console.error('Error reactivating product:', error);
    throw error;
  }
}

/**
 * Excluir produto permanentemente
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Buscar todos os produtos (incluindo inativos)
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('name', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}
