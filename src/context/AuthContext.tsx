import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Propriedade, PlanType } from '../types';
import {
  authApi,
  propertyApi,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  propriedade: Propriedade | null;
  propriedades: Propriedade[];
  loading: boolean;
  isSessionExpired: boolean;
  showInactivityWarning: boolean;
  remainingInactivitySeconds: number;
  extendSession: () => Promise<void>;
  login: (credentials: {
    email: string;
    password: string;
    captchaId?: string;
    captchaAnswer?: string;
    twoFactorCode?: string;
  }) => Promise<{ require2FA?: boolean }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    propertyName: string;
    lgpdAccepted: boolean;
  }) => Promise<{ verificationToken?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchProperty: (propriedadeId: string) => Promise<void>;
  createProperty: (data: Partial<Propriedade>) => Promise<Propriedade>;
  dismissSessionExpiredModal: () => void;
  updateLocalProperty: (property: Propriedade) => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  updateUserPlanLocal: (newPlan: PlanType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [propriedade, setPropriedade] = useState<Propriedade | null>(null);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [remainingInactivitySeconds, setRemainingInactivitySeconds] = useState(300); // 5 min warning

  const lastActivityRef = useRef<number>(Date.now());

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('staypro_onboarding_dismissed') !== 'true';
  });

  const { success, error, info } = useToast();

  const fetchProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await authApi.me();
      setUser(data.user);
      setPropriedade(data.propriedade);
      if (data.propriedades && data.propriedades.length > 0) {
        setPropriedades(data.propriedades);
      } else if (data.propriedade) {
        setPropriedades([data.propriedade]);
      }
    } catch (err: any) {
      // Try refresh token once
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refRes = await authApi.refreshToken(refreshToken);
          setStoredToken(refRes.token);
          setStoredRefreshToken(refRes.refreshToken);
          const retryData = await authApi.me();
          setUser(retryData.user);
          setPropriedade(retryData.propriedade);
          if (retryData.propriedades && retryData.propriedades.length > 0) {
            setPropriedades(retryData.propriedades);
          }
          return;
        } catch {
          // refresh failed
        }
      }
      console.warn('Session check failed or expired:', err);
      removeStoredToken();
      setUser(null);
      setPropriedade(null);
      setPropriedades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Listen for session expiry event
    const handleSessionExpired = () => {
      setUser(null);
      setPropriedade(null);
      setPropriedades([]);
      setIsSessionExpired(true);
      setShowInactivityWarning(false);
    };

    window.addEventListener('staypro:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('staypro:session-expired', handleSessionExpired);
    };
  }, [fetchProfile]);

  // Background Token Rotation (every 12 minutes to keep access token fresh)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const res = await authApi.refreshToken(refreshToken);
          setStoredToken(res.token);
          setStoredRefreshToken(res.refreshToken);
        } catch (e) {
          console.warn('[Stay Pro Auth] Token refresh cycle failed:', e);
        }
      }
    }, 12 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Client-side Inactivity Monitor (25 min warning, 30 min expiration)
  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Check timer every 10 seconds
    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const thirtyMinutesMs = 30 * 60 * 1000;
      const twentyFiveMinutesMs = 25 * 60 * 1000;

      if (idleMs >= thirtyMinutesMs) {
        setShowInactivityWarning(false);
        setIsSessionExpired(true);
        removeStoredToken();
        setUser(null);
        setPropriedade(null);
        setPropriedades([]);
        info('Sessão Expirada', 'Você ficou inativo por mais de 30 minutos. Por favor faça login novamente.');
      } else if (idleMs >= twentyFiveMinutesMs) {
        setShowInactivityWarning(true);
        const remainingSec = Math.max(0, Math.ceil((thirtyMinutesMs - idleMs) / 1000));
        setRemainingInactivitySeconds(remainingSec);
      } else {
        setShowInactivityWarning(false);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [user, info, showInactivityWarning]);

  const extendSession = async () => {
    try {
      await authApi.extendSession();
      lastActivityRef.current = Date.now();
      setShowInactivityWarning(false);
      success('Sessão Estendida', 'Sua sessão foi renovada por mais 30 minutos com segurança.');
    } catch {
      // ignore
    }
  };

  const login = async (credentials: {
    email: string;
    password: string;
    captchaId?: string;
    captchaAnswer?: string;
    twoFactorCode?: string;
  }): Promise<{ require2FA?: boolean }> => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.require2FA) {
        setLoading(false);
        return { require2FA: true };
      }

      setStoredToken(res.token);
      if (res.refreshToken) {
        setStoredRefreshToken(res.refreshToken);
      }
      setUser(res.user);
      setIsSessionExpired(false);
      setShowInactivityWarning(false);
      lastActivityRef.current = Date.now();
      await fetchProfile();
      success('Bem-vindo(a)!', `Login realizado com sucesso como ${res.user.name}.`);
      return { require2FA: false };
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    propertyName: string;
    lgpdAccepted: boolean;
  }) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      setStoredToken(res.token);
      if (res.refreshToken) {
        setStoredRefreshToken(res.refreshToken);
      }
      setUser(res.user);
      setIsSessionExpired(false);
      setShowInactivityWarning(false);
      setShowOnboarding(true);
      lastActivityRef.current = Date.now();
      localStorage.removeItem('staypro_onboarding_dismissed');
      await fetchProfile();
      success('Conta criada!', 'Seja bem-vindo ao Stay Pro! Seu primeiro imóvel foi cadastrado.');
      return { verificationToken: res.verificationToken };
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    } finally {
      removeStoredToken();
      setUser(null);
      setPropriedade(null);
      setPropriedades([]);
      setShowInactivityWarning(false);
      info('Desconectado', 'Sua sessão foi encerrada com segurança.');
    }
  };

  const switchProperty = async (propriedadeId: string) => {
    try {
      const res = await authApi.switchProperty(propriedadeId);
      setUser(res.user);
      setPropriedade(res.propriedade);
      setPropriedades(res.propriedades);
      success('Imóvel Alterado', `Agora você está gerenciando "${res.propriedade.nome}".`);
      window.dispatchEvent(new CustomEvent('staypro:property-changed', { detail: { propertyId: propriedadeId } }));
    } catch (err: any) {
      error('Erro ao trocar imóvel', err.message || 'Não foi possível alterar o imóvel ativo.');
      throw err;
    }
  };

  const createProperty = async (data: Partial<Propriedade>): Promise<Propriedade> => {
    try {
      const res = await propertyApi.create(data);
      setUser(res.user);
      setPropriedade(res.propriedade);
      setPropriedades(res.propriedades);
      success('Novo Imóvel Cadastrado', `O imóvel "${res.propriedade.nome}" foi cadastrado e selecionado!`);
      window.dispatchEvent(new CustomEvent('staypro:property-changed', { detail: { propertyId: res.propriedade.id } }));
      return res.propriedade;
    } catch (err: any) {
      error('Erro ao cadastrar imóvel', err.message || 'Não foi possível salvar o novo imóvel.');
      throw err;
    }
  };

  const dismissSessionExpiredModal = () => {
    setIsSessionExpired(false);
  };

  const updateLocalProperty = (property: Propriedade) => {
    setPropriedade(property);
    setPropriedades((prev) => prev.map((p) => (p.id === property.id ? property : p)));
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('staypro_onboarding_dismissed', 'true');
  };

  const updateUserPlanLocal = (newPlan: PlanType) => {
    if (user) {
      setUser({ ...user, plan: newPlan });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        propriedade,
        propriedades,
        loading,
        isSessionExpired,
        showInactivityWarning,
        remainingInactivitySeconds,
        extendSession,
        login,
        register,
        logout,
        refreshProfile: fetchProfile,
        switchProperty,
        createProperty,
        dismissSessionExpiredModal,
        updateLocalProperty,
        showOnboarding,
        dismissOnboarding,
        updateUserPlanLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

