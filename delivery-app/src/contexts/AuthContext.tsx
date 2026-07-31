import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole, Address } from '@/types';

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  addresses: Address[];
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
  addAddress: (address: Omit<Address, 'id'>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  getDefaultAddress: () => Address | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock addresses
const mockAddresses: Address[] = [
  {
    id: 'addr-001',
    label: 'Casa',
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    isDefault: true,
  },
  {
    id: 'addr-002',
    label: 'Trabalho',
    street: 'Av. Paulista',
    number: '1000',
    complement: '15º andar',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    isDefault: false,
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);

  const login = useCallback(async (_email: string, _password: string, _role?: UserRole): Promise<boolean> => {
    // O delivery público usa a sessão vinculada ao telefone/dispositivo.
    // Credenciais simuladas no frontend não podem liberar áreas internas.
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const register = useCallback(async (data: RegisterInput): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 400));
    setUser({
      id: generateId(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    });
    return true;
  }, []);


  const addAddress = useCallback((address: Omit<Address, 'id'>) => {
    const newAddress: Address = {
      ...address,
      id: generateId(),
    };

    setAddresses(prev => {
      // Se é o primeiro endereço, marca como padrão
      if (prev.length === 0) {
        return [{ ...newAddress, isDefault: true }];
      }

      // Se o novo é padrão, remove flag dos outros
      if (newAddress.isDefault) {
        return [
          ...prev.map(a => ({ ...a, isDefault: false })),
          newAddress,
        ];
      }

      return [...prev, newAddress];
    });
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses(prev => {
      const filtered = prev.filter(a => a.id !== id);
      // Se removeu o padrão, marca o primeiro como novo padrão
      if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses(prev =>
      prev.map(a => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  }, []);

  const getDefaultAddress = useCallback(() => {
    return addresses.find(a => a.isDefault) || addresses[0];
  }, [addresses]);

  return (
    <AuthContext.Provider
      value={{
        user,
        addresses,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        addAddress,
        removeAddress,
        setDefaultAddress,
        getDefaultAddress,
      }}
    >
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
