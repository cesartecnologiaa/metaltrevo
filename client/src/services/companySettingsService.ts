import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CompanySettings {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  logoUrl?: string;
  updatedAt: Date;
  updatedBy: string;
}

const SETTINGS_DOC_ID = 'company_settings';

export const getCompanySettings = async (): Promise<CompanySettings | null> => {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CompanySettings;
    }
    
    // Retornar configurações padrão se não existir
    return {
      name: 'Metal Trevo',
      cnpj: '',
      phone: '',
      address: '',
      updatedAt: new Date(),
      updatedBy: 'system'
    };
  } catch (error) {
    console.error('Error getting company settings:', error);
    throw error;
  }
};

export const updateCompanySettings = async (
  settings: Omit<CompanySettings, 'updatedAt' | 'updatedBy'>,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date(),
      updatedBy: userId
    });
  } catch (error) {
    console.error('Error updating company settings:', error);
    throw error;
  }
};
