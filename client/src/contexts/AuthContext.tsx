import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type UserRole = 'admin' | 'vendedor' | 'caixa' | 'deposito';

export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se é o primeiro usuário do sistema
  async function isFirstUser(): Promise<boolean> {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.empty;
  }

  // Buscar dados do usuário no Firestore
  async function fetchUserData(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid,
          email: data.email,
          role: data.role,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  // Login
  async function signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const data = await fetchUserData(userCredential.user.uid);
    setUserData(data);
  }

  // Registro (primeiro acesso)
  async function signUp(email: string, password: string, name: string, role?: UserRole) {
    // Verificar se é o primeiro usuário
    const firstUser = await isFirstUser();
    const userRole: UserRole = firstUser ? 'admin' : (role || 'vendedor');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Criar documento do usuário no Firestore
    const newUserData: UserData = {
      uid: userCredential.user.uid,
      email,
      role: userRole,
      name,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      role: userRole,
      name,
      createdAt: new Date(),
    });

    setUserData(newUserData);
  }

  // Criar usuário (apenas admin)
  async function createUser(email: string, password: string, name: string, role: UserRole) {
    // Verificar se o usuário atual é admin
    if (userData?.role !== 'admin') {
      throw new Error('Apenas administradores podem criar usuários');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      role,
      name,
      createdAt: new Date(),
    });
  }

  // Logout
  async function signOut() {
    await firebaseSignOut(auth);
    setUserData(null);
  }

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const data = await fetchUserData(user.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    createUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
