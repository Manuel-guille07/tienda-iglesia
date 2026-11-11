import { create } from 'zustand';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../data/initialData';
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
  users: INITIAL_USERS,
  allProfiles: INITIAL_USERS,
  currentUser: null,
  isAuthenticated: false,
  selectedUserForPin: INITIAL_USERS[0],
  isLoading: false,
  isInitialized: false,

  loadProfiles: async () => {
    try {
      const dbProfiles = await getProfiles();
      if (dbProfiles && dbProfiles.length > 0) {
        const activeUsers = dbProfiles.filter((u: User) => u.isActive !== false);
        set({
          allProfiles: dbProfiles,
          users: activeUsers.length > 0 ? activeUsers : INITIAL_USERS,
        });
        if (!get().selectedUserForPin && dbProfiles[0]) {
          set({ selectedUserForPin: dbProfiles[0] });
        }
      } else {
        set({
          allProfiles: INITIAL_USERS,
          users: INITIAL_USERS,
        });
      }
    } catch (err) {
      console.warn('[useAuthStore] Error cargando perfiles desde Supabase:', err);
    }
  },

  initAuth: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Cargar perfiles dinámicos desde la tabla 'profiles' en Supabase
      await get().loadProfiles();

      // 2. Comprobar sesión de Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user && !get().currentUser) {
        const email = sessionData.session.user.email || '';
        const currentUsersList = get().users;
        const matched = currentUsersList.find((u) => getUserInternalEmail(u) === email || u.email === email);
        if (matched) {
          set({
            currentUser: matched,
            selectedUserForPin: matched,
            isAuthenticated: true,
          });
        }
      }

      // 3. Configurar listener de cambios de estado de Supabase Auth
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const email = session.user.email || '';
          const currentUsersList = get().users;
          const matched = currentUsersList.find((u) => getUserInternalEmail(u) === email || u.email === email);
          if (matched && get().currentUser?.id !== matched.id) {
            set({
              currentUser: matched,
              selectedUserForPin: matched,
              isAuthenticated: true,
            });
          }
        } else if (event === 'SIGNED_OUT') {
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
    const { selectedUserForPin, users } = get();
    const targetUser = selectedUserForPin || users[0];

    if (!targetUser) {
      return { success: false, message: 'No hay usuario seleccionado' };
    }

    set({ isLoading: true });

    // Verificación del PIN
    if (targetUser.pin !== pin) {
      set({ isLoading: false });
      return { success: false, message: 'PIN incorrecto. Inténtalo de nuevo.' };
    }

    // Intento de autenticación en Supabase Auth si corresponde
    const internalEmail = getUserInternalEmail(targetUser);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: pin,
      });

      if (error) {
        console.info(`[Auth Híbrido] Fallback activo para ${internalEmail}:`, error.message);
      }
    } catch (authErr) {
      console.info('[Auth Híbrido] Excepción en llamada Supabase Auth, continuando con perfil activo:', authErr);
    }

    set({
      currentUser: targetUser,
      isAuthenticated: true,
      isLoading: false,
    });

    return { success: true };
  },

  logout: async () => {
    try {
      await supabase.auth.signOut().catch((err: any) => {
        console.warn('Error en signOut de Supabase:', err);
      });
    } catch (e) {
      console.warn('Error durante logout:', e);
    } finally {
      set({
        currentUser: null,
        isAuthenticated: false,
      });
    }
  },

  loginAs: (user: User) => {
    set({ currentUser: user, isAuthenticated: true });
  },

  saveUserProfile: async (userData) => {
    const updatedUser: User = {
      id: userData.id,
      name: userData.name,
      pin: userData.pin,
      role: userData.role,
      avatar: userData.avatar || '👤',
      email: userData.email || getUserInternalEmail(userData as User),
      isActive: userData.isActive ?? true,
    };

    // 1. Guardar en Supabase tabla 'profiles'
    const saved = await upsertProfile(updatedUser);

    // 2. Actualizar estado en memoria
    const currentProfiles = get().allProfiles.filter((p) => p.id !== updatedUser.id);
    const newAllProfiles = [saved || updatedUser, ...currentProfiles];
    const newActiveUsers = newAllProfiles.filter((u) => u.isActive !== false);

    set({
      allProfiles: newAllProfiles,
      users: newActiveUsers,
    });

    if (get().currentUser?.id === updatedUser.id) {
      set({ currentUser: saved || updatedUser });
    }

    return { success: true, profile: saved || updatedUser };
  },
}));
