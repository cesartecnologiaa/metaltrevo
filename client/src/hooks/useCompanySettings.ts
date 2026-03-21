import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CompanySettings {
  name: string;
  subtitle?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings>({
    name: 'Metal Trevo', // Valor padrão
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      loadSettings();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as CompanySettings;
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup para evitar memory leaks
  useEffect(() => {
    return () => {
      setHasLoaded(false);
    };
  }, []);

  return { settings, loading, hasLoaded };
};
