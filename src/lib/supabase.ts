import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = "https://rjeklfwxuryiktwodbfg.supabase.co";
const rawKey = "[eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqZWtsZnd4dXJ5aWt0d29kYmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNTI0NTIsImV4cCI6MjEwOTkyODQ1Mn0.l5EEjpRvohSAHccb4hsMaFl3-vnZRAZKxyJnscIjTYM]";

// Validar que sea una URL HTTP/HTTPS real y bien formada
const isValidUrl = (url: any): boolean => {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl.trim() : '';
const cleanKey = typeof rawKey === 'string' ? rawKey.replace(/^\[|\]$/g, '').trim() : '';
const supabaseAnonKey = cleanKey !== '' ? cleanKey : '';

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | any;

if (isConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('[Supabase] Error al inicializar cliente real, pasando a mock local:', err);
    client = createMockSupabase();
  }
} else {
  console.info('[Supabase] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no detectadas. Usando mock en memoria.');
  client = createMockSupabase();
}

function createMockSupabase(): any {
  const createBuilder = () => {
    const builder: any = {
      then: (onfulfilled?: any, onrejected?: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected),
      catch: (onrejected?: any) => Promise.resolve({ data: [], error: null }).catch(onrejected),
      finally: (onfinally?: any) => Promise.resolve({ data: [], error: null }).finally(onfinally),
      select: () => builder,
      insert: () => builder,
      upsert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      neq: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    return builder;
  };

  const mockChannel: any = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => Promise.resolve('ok'),
  };

  return {
    from: () => createBuilder(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    channel: () => mockChannel,
    removeChannel: () => Promise.resolve('ok'),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
}

export const isSupabaseConfigured = isConfigured;
export const supabase = client;

export function createSecondarySupabaseClient(): SupabaseClient | any {
  if (isConfigured) {
    try {
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Error al crear cliente secundario sin persistencia:', err);
      return createMockSupabase();
    }
  }
  return createMockSupabase();
}