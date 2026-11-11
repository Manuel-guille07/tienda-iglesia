import { create } from 'zustand';
import { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { getProfiles, upsertProfile } from '../services/db';

export function getUserInternalEmail(user: User): string {
  if (user.email) return user.email;
  const roleSlug = user.role.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return `${roleSlug}@tienda.local`;
}

interface AuthState {
  users: User[];
  allProfiles: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  selectedUserForPin: User | null;
  isLoading: boolean;
  isLoadingProfiles: boolean;
  isInitialized: boolean;

  // Actions
  initAuth: () => Promise<void>;
  loadProfiles: () => Promise<void>;
  setSelectedUserForPin: (user: User | null) => void;
  loginWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loginAs: (user: User) => void;
  saveUserProfile: (userData: Partial<User> & { id: string; name: string; pin: string; role: Role }) => Promise<{ success: boolean; profile?: User }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  users: [],
  allProfiles: [],
  currentUser: null,
  isAuthenticated: false,
  selectedUserForPin: null,
  isLoading: false,
  isLoadingProfiles: false,
  isInitialized: false,

  loadProfiles: async () => {
    set({ isLoadingProfiles: true });
    try {
      const dbProfiles = await getProfiles();
      if (dbProfiles && dbProfiles.length > 0) {
        const activeUsers = dbProfiles.filter((u: User) => u.isActive !== false);
        set({
          allProfiles: dbProfiles,
          users: activeUsers,
        });

        const currentSel = get().selectedUserForPin;
        if (!currentSel && activeUsers.length > 0) {
          set({ selectedUserForPin: activeUsers[0] });
        } else if (currentSel) {
          const matched = activeUsers.find((u: User) => u.id === currentSel.id);
          if (matched) {
            set({ selectedUserForPin: matched });
          } else if (activeUsers.length > 0) {
            set({ selectedUserForPin: activeUsers[0] });
          }
        }
      } else {
        set({
          allProfiles: [],
          users: [],
          selectedUserForPin: null,
        });
      }
    } catch (err) {
      console.warn('[useAuthStore] Error cargando perfiles desde Supabase:', err);
    } finally {
      set({ isLoadingProfiles: false });
    }
  },

  initAuth: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Cargar perfiles dinámicos desde la tabla 'profiles' en Supabase
      await get().loadProfiles();

      // 2. Comprobar sesión activa de Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const email = sessionData.session.user.email || '';
        const currentUsersList = get().allProfiles;
        const matched = currentUsersList.find((u) => getUserInternalEmail(u) === email || u.email === email);
        if (matched) {
          sessionStorage.setItem('elarx_active_user_id', matched.id);
          set({
            currentUser: matched,
            selectedUserForPin: matched,
            isAuthenticated: true,
          });
        }
      }

      // 3. Fallback: Si no hay token de Supabase Auth, restaurar usuario autenticado desde sessionStorage
      if (!get().currentUser) {
        const storedUserId = sessionStorage.getItem('elarx_active_user_id');
        if (storedUserId) {
          const currentUsersList = get().allProfiles;
          const matched = currentUsersList.find((u) => u.id === storedUserId && u.isActive !== false);
          if (matched) {
            set({
              currentUser: matched,
              selectedUserForPin: matched,
              isAuthenticated: true,
            });
          }
        }
      }

      // 4. Configurar listener de cambios de estado de Supabase Auth
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const email = session.user.email || '';
          const currentUsersList = get().allProfiles;
          const matched = currentUsersList.find((u) => getUserInternalEmail(u) === email || u.email === email);
          if (matched && get().currentUser?.id !== matched.id) {
            sessionStorage.setItem('elarx_active_user_id', matched.id);
            set({
              currentUser: matched,
              selectedUserForPin: matched,
              isAuthenticated: true,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('elarx_active_user_id');
          set({ currentUser: null, isAuthenticated: false });
        }
      });
    } catch (err) {
      console.warn('[Auth] Error al inicializar sesión:', err);
    } finally {
      set({ isInitialized: true });
    }
  },

  setSelectedUserForPin: (user) => set({ selectedUserForPin: user }),

  loginWithPin: async (pin: string) => {
    const { selectedUserForPin } = get();

    if (!selectedUserForPin) {
      return { success: false, message: 'Selecciona un usuario de la lista' };
    }

    set({ isLoading: true });

    // Verificación estricta del PIN del usuario seleccionado
    if (selectedUserForPin.pin !== pin) {
      set({ isLoading: false });
      return { success: false, message: 'PIN incorrecto. Inténtalo de nuevo.' };
    }

    // Guardar ID en sessionStorage para persistencia en recargas (F5)
    sessionStorage.setItem('elarx_active_user_id', selectedUserForPin.id);

    // Intento opcional de autenticación en Supabase Auth con PIN como contraseña
    const internalEmail = getUserInternalEmail(selectedUserForPin);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: pin,
      });

      if (error) {
        console.info(`[Auth Híbrido] Fallback local activo para ${internalEmail}:`, error.message);
      }
    } catch (authErr) {
      console.info('[Auth Híbrido] Excepción en llamada Supabase Auth, continuando con perfil activo:', authErr);
    }

    set({
      currentUser: selectedUserForPin,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true };
  },

  logout: async () => {
    try {
      sessionStorage.removeItem('elarx_active_user_id');
      await supabase.auth.signOut().catch((err: any) => {
        console.warn('Error en signOut de Supabase:', err);
      });
    } catch (e) {
      console.warn('Error durante logout:', e);
    } finally {
      sessionStorage.removeItem('elarx_active_user_id');
      set({
        currentUser: null,
        isAuthenticated: false,
      });
    }
  },

  loginAs: (user: User) => {
    sessionStorage.setItem('elarx_active_user_id', user.id);
    set({ currentUser: user, isAuthenticated: true });
  },

  saveUserProfile: async (userData) => {
    const updatedUser: User = {
      id: userData.id || `usr-${Date.now()}`,
      name: userData.name,
      pin: userData.pin,
      role: userData.role,
      avatar: userData.avatar || '👤',
      email: userData.email || getUserInternalEmail(userData as User),
      isActive: userData.isActive ?? true,
    };

    // 1. Guardar en Supabase tabla 'profiles'
    const saved = await upsertProfile(updatedUser);

    // 2. Intentar registrar el usuario en Supabase Auth con su PIN
    try {
      const internalEmail = updatedUser.email;
      await supabase.auth.signUp({
        email: internalEmail,
        password: updatedUser.pin,
      });
    } catch (authSignUpErr) {
      console.info('[saveUserProfile] signUp en Supabase Auth no requerido o ya existente:', authSignUpErr);
    }

    // 3. Recargar lista de perfiles
    await get().loadProfiles();

    if (get().currentUser?.id === updatedUser.id) {
      set({ currentUser: saved || updatedUser });
    }

    return { success: true, profile: saved || updatedUser };
  },
}));
