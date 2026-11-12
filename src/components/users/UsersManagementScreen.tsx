import React, { useState } from 'react';
import { Users, UserPlus, ShieldCheck, Key, CheckCircle2, XCircle, Edit3, Save, X, Search } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { User, Role } from '../../types';
import { UserAvatarIcon, AVATAR_OPTIONS, sanitizeAvatarKey } from '../ui/UserAvatarIcon';
import toast from 'react-hot-toast';

export const UsersManagementScreen: React.FC = () => {
  const { users, allProfiles, currentUser, saveUserProfile, loadProfiles } = useAuthStore();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const profileList = allProfiles.length > 0 ? allProfiles : users;

  const filteredUsers = profileList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingUser({
      id: '',
      name: '',
      pin: '0000',
      role: 'Vendedor',
      isActive: true,
      avatar: 'user',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser({
      ...user,
      avatar: sanitizeAvatarKey(user.avatar),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name?.trim()) {
      toast.error('El nombre del usuario no puede estar vacío');
      return;
    }
    if (!editingUser.pin || editingUser.pin.length !== 4 || !/^\d{4}$/.test(editingUser.pin)) {
      toast.error('El PIN debe constar exactamente de 4 dígitos numéricos');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando usuario en Supabase...');
    try {
      const result = await saveUserProfile({
        id: editingUser.id || '',
        name: editingUser.name.trim(),
        pin: editingUser.pin,
        role: (editingUser.role as Role) || 'Vendedor',
        isActive: editingUser.isActive !== false,
        avatar: sanitizeAvatarKey(editingUser.avatar),
      });
      toast.dismiss(toastId);
      if (result.success) {
        await loadProfiles();
        toast.success(t('users.saved'));
        setIsModalOpen(false);
        setEditingUser(null);
      } else {
        toast.error(result.message || 'Error al guardar el perfil del usuario en Supabase');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || 'Error al guardar el perfil del usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes desactivar tu propio usuario activo');
      return;
    }
    const updated: User = {
      ...user,
      avatar: sanitizeAvatarKey(user.avatar),
      isActive: !user.isActive,
    };
    try {
      const result = await saveUserProfile(updated);
      if (result.success) {
        await loadProfiles();
        toast.success(`Usuario ${updated.name} ${updated.isActive ? 'activado' : 'desactivado'}`);
      } else {
        toast.error(result.message || 'Error al actualizar el estado del usuario');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar el estado del usuario');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span>Panel de Administración Restringido</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('users.title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('users.subtitle')}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('users.newUser')}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-4 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o rol..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Usuarios: <span className="text-cyan-400 font-mono font-bold">{profileList.length}</span>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const isActive = u.isActive !== false;
          const isCurrent = u.id === currentUser?.id;

          return (
            <div
              key={u.id}
              className={`bg-slate-900 border ${
                isCurrent ? 'border-cyan-500/50 shadow-cyan-950/40 shadow-lg' : 'border-slate-800'
              } rounded-xl p-5 flex flex-col justify-between transition-all hover:border-slate-700`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <UserAvatarIcon icon={u.avatar} size="lg" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-white text-base leading-snug">{u.name}</h3>
                        {isCurrent && (
                          <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-medium">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 capitalize">{u.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    title={isActive ? 'Desactivar usuario' : 'Activar usuario'}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5" /> PIN:
                    </span>
                    <span className="font-mono font-bold tracking-widest text-cyan-400">
                      •••• ({u.pin})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('users.status')}:</span>
                    <span className={isActive ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {isActive ? t('users.active') : t('users.inactive')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('users.editUser')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>{editingUser.id ? t('users.editUser') : t('users.newUser')}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-slate-200 text-sm">
              {/* Compact 6-Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  {t('users.avatar')}
                </label>
                <div className="grid grid-cols-6 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {AVATAR_OPTIONS.map((opt) => {
                    const selectedKey = sanitizeAvatarKey(editingUser.avatar);
                    const isSelected = selectedKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        title={opt.label}
                        onClick={() => setEditingUser({ ...editingUser, avatar: opt.key })}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10 scale-105'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <UserAvatarIcon icon={opt.key} size="sm" />
                        <span className="text-[9px] font-medium text-slate-400 mt-1 truncate max-w-full">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('users.name')}
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Ej. Hermano Carlos"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('users.pin')}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  pattern="\d{4}"
                  value={editingUser.pin || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ej. 1234"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-cyan-400 tracking-widest text-center text-lg placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  PIN numérico de 4 dígitos para inicio de sesión táctil
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('users.role')}
                </label>
                <select
                  value={editingUser.role || 'Vendedor'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Vendedor">{t('auth.role.vendedor')}</option>
                  <option value="Tesorería">{t('auth.role.tesoreria')}</option>
                  <option value="Pastor">{t('auth.role.pastor')}</option>
                  <option value="super_admin">{t('auth.role.super_admin')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-medium text-slate-300">Cuenta Activa (Habilitada)</span>
                <input
                  type="checkbox"
                  checked={editingUser.isActive !== false}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
