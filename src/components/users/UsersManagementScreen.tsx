import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  Search,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { User, Role } from '../../types';
import { UserAvatarIcon, AVATAR_OPTIONS, sanitizeAvatarKey } from '../ui/UserAvatarIcon';
import { QADiagnosticModal } from './QADiagnosticModal';
import toast from 'react-hot-toast';

export const UsersManagementScreen: React.FC = () => {
  const { users, allProfiles, currentUser, saveUserProfile, loadProfiles } = useAuthStore();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);

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
    if (isSaving) return;

    if (!editingUser || !editingUser.name?.trim()) {
      toast.error('El nombre del usuario no puede estar vacío');
      return;
    }
    if (!editingUser.pin || editingUser.pin.length !== 4 || !/^\d{4}$/.test(editingUser.pin)) {
      toast.error('El PIN debe constar exactamente de 4 dígitos numéricos');
      return;
    }

    const willBeActive = editingUser.isActive !== false;
    const newRole = (editingUser.role as Role) || 'Vendedor';

    if (editingUser.id && editingUser.id === currentUser?.id) {
      if (!willBeActive) {
        toast.error(t('users.cannotDeactivateSelf'));
        return;
      }
      if (currentUser.role === 'super_admin' && newRole !== 'super_admin') {
        toast.error(t('users.cannotDeactivateSelf'));
        return;
      }
    }

    if (editingUser.id) {
      const existingTarget = profileList.find((u) => u.id === editingUser.id);
      if (existingTarget?.role === 'super_admin') {
        const remainingActiveSuperAdmins = profileList.filter(
          (u) => u.id !== editingUser.id && u.role === 'super_admin' && u.isActive !== false
        );
        if ((!willBeActive || newRole !== 'super_admin') && remainingActiveSuperAdmins.length === 0) {
          toast.error(t('users.minOneAdmin'));
          return;
        }
      }
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando usuario en Supabase...');
    try {
      const result = await saveUserProfile({
        id: editingUser.id || '',
        name: editingUser.name.trim(),
        pin: editingUser.pin,
        role: newRole,
        isActive: willBeActive,
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
    if (togglingId) return;
    if (user.id === currentUser?.id) {
      toast.error(t('users.cannotDeactivateSelf'));
      return;
    }

    if (user.isActive !== false && user.role === 'super_admin') {
      const remainingActiveSuperAdmins = profileList.filter(
        (u) => u.id !== user.id && u.role === 'super_admin' && u.isActive !== false
      );
      if (remainingActiveSuperAdmins.length === 0) {
        toast.error(t('users.minOneAdmin'));
        return;
      }
    }

    const updated: User = {
      ...user,
      avatar: sanitizeAvatarKey(user.avatar),
      isActive: !user.isActive,
    };
    setTogglingId(user.id);
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
    } finally {
      setTogglingId(null);
    }
  };

  const cardSurface = isDark
    ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]';

  const elevatedSurface = isDark
    ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]';

  const primaryButtonClass = isDark
    ? 'bg-[#EFECE6] hover:bg-[#FAF8F5] text-[#141210] border border-[#EFECE6]'
    : 'bg-[#141210] hover:bg-[#2A2420] text-[#FAF8F5] border border-[#141210]';

  const secondaryButtonClass = isDark
    ? 'bg-[#211D1A] hover:bg-[#2A2420] text-[#F4F0EA] border border-[#2A2420]'
    : 'bg-[#EFECE6] hover:bg-[#E2DDD5] text-[#141210] border border-[#E2DDD5]';

  const secondaryText = isDark ? 'text-[#9A9086]' : 'text-[#3D352F]';
  const inputSurface = isDark
    ? 'bg-[#0E0C0B] border-[#2A2420] text-[#F4F0EA] placeholder-[#7C7268] focus:border-[#EFECE6]'
    : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]';

  return (
    <div className={`p-4 sm:p-6 max-w-6xl mx-auto space-y-6 ${isDark ? 'text-[#F4F0EA]' : 'text-[#141210]'}`}>
      {/* Header Banner */}
      <div className={`border rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${cardSurface}`}>
        <div>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${secondaryText}`}>
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de Administración Restringido</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('users.title')}</h1>
          <p className={`text-sm mt-1 ${secondaryText}`}>{t('users.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {currentUser?.role === 'super_admin' && (
            <button
              type="button"
              onClick={() => setIsQAModalOpen(true)}
              className={`min-h-[44px] px-4 py-2.5 font-semibold text-sm rounded-full transition-all flex items-center gap-2 cursor-pointer ${secondaryButtonClass}`}
            >
              <Activity className="w-4 h-4" />
              <span>{t('qa.button')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreate}
            className={`min-h-[44px] px-5 py-2.5 font-semibold text-sm rounded-full shadow-sm transition-all flex items-center gap-2 cursor-pointer ${primaryButtonClass}`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('users.newUser')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className={`flex flex-wrap items-center justify-between border rounded-3xl p-4 gap-4 ${cardSurface}`}>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${secondaryText}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o rol..."
            className={`w-full min-h-[42px] pl-10 pr-4 py-2 border rounded-2xl text-sm focus:outline-none transition-colors ${inputSurface}`}
          />
        </div>
        <div className={`text-xs font-medium ${secondaryText}`}>
          Total Usuarios:{' '}
          <span className={`font-mono font-bold tabular-nums ${isDark ? 'text-[#F4F0EA]' : 'text-[#141210]'}`}>
            {profileList.length}
          </span>
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
              className={`border rounded-3xl p-5 flex flex-col justify-between transition-all ${cardSurface} ${
                isCurrent
                  ? isDark
                    ? 'ring-2 ring-[#EFECE6]'
                    : 'ring-2 ring-[#141210]'
                  : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <UserAvatarIcon icon={u.avatar} size="lg" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base leading-snug">{u.name}</h3>
                        {isCurrent && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isDark
                                ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6]'
                                : 'bg-[#141210] text-[#FAF8F5] border-[#141210]'
                            }`}
                          >
                            Tú
                          </span>
                        )}
                      </div>
                      <span className={`text-xs capitalize ${secondaryText}`}>{u.role}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={togglingId === u.id}
                    onClick={() => handleToggleStatus(u)}
                    title={
                      isCurrent
                        ? t('users.cannotDeactivateSelf')
                        : isActive
                        ? 'Desactivar usuario'
                        : 'Activar usuario'
                    }
                    className={`p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                      isDark ? 'hover:bg-[#211D1A]' : 'hover:bg-[#EFECE6]'
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle2 className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`} />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                  </button>
                </div>

                <div className={`border rounded-2xl p-3 space-y-1.5 text-xs mb-4 ${elevatedSurface}`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 font-medium ${secondaryText}`}>
                      <Key className="w-3.5 h-3.5" /> PIN:
                    </span>
                    <span className="font-mono font-bold tracking-widest tabular-nums">
                      •••• ({u.pin})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${secondaryText}`}>{t('users.status')}:</span>
                    <span
                      className={`font-semibold ${
                        isActive
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-800'
                          : 'text-rose-600'
                      }`}
                    >
                      {isActive ? t('users.active') : t('users.inactive')}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-end gap-2 ${
                  isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleOpenEdit(u)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${secondaryButtonClass}`}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 ${cardSurface}`}>
            <div
              className={`flex items-center justify-between border-b pb-4 ${
                isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-lg">
                <Users className="w-5 h-5" />
                <span>{editingUser.id ? t('users.editUser') : t('users.newUser')}</span>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#211D1A] text-[#9A9086]' : 'hover:bg-[#EFECE6] text-[#3D352F]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              {/* Compact 6-Icon Picker */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${secondaryText}`}>
                  {t('users.avatar')}
                </label>
                <div className={`grid grid-cols-6 gap-2 p-2.5 rounded-2xl border ${elevatedSurface}`}>
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
                            ? isDark
                              ? 'bg-[#EFECE6] text-[#141210] border-[#EFECE6] scale-105 shadow-sm'
                              : 'bg-[#141210] text-[#FAF8F5] border-[#141210] scale-105 shadow-sm'
                            : isDark
                            ? 'bg-[#171412] border-[#2A2420] opacity-75 hover:opacity-100'
                            : 'bg-[#FAF8F5] border-[#E2DDD5] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <UserAvatarIcon icon={opt.key} size="sm" />
                        <span className="text-[9px] font-semibold mt-1 truncate max-w-full">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${secondaryText}`}>
                  {t('users.name')}
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Ej. Hermano Carlos"
                  className={`w-full px-3.5 py-2.5 border rounded-2xl focus:outline-none ${inputSurface}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${secondaryText}`}>
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
                  className={`w-full px-3.5 py-2.5 border rounded-2xl font-mono font-bold tracking-widest text-center text-lg focus:outline-none ${inputSurface}`}
                />
                <span className={`text-[11px] mt-1 block ${secondaryText}`}>
                  PIN numérico de 4 dígitos para inicio de sesión táctil
                </span>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${secondaryText}`}>
                  {t('users.role')}
                </label>
                <select
                  value={editingUser.role || 'Vendedor'}
                  disabled={Boolean(
                    editingUser.id && editingUser.id === currentUser?.id && currentUser?.role === 'super_admin'
                  )}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                  className={`w-full px-3.5 py-2.5 border rounded-2xl focus:outline-none disabled:opacity-50 ${inputSurface}`}
                >
                  <option value="Vendedor">{t('auth.role.vendedor')}</option>
                  <option value="Tesorería">{t('auth.role.tesoreria')}</option>
                  <option value="Pastor">{t('auth.role.pastor')}</option>
                  <option value="super_admin">{t('auth.role.super_admin')}</option>
                </select>
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${elevatedSurface}`}>
                <span className="text-xs font-semibold">Cuenta Activa (Habilitada)</span>
                <input
                  type="checkbox"
                  disabled={Boolean(editingUser.id && editingUser.id === currentUser?.id)}
                  checked={editingUser.isActive !== false}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[#141210] rounded cursor-pointer disabled:opacity-40"
                />
              </div>

              <div
                className={`flex items-center justify-end gap-2.5 pt-4 border-t ${
                  isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
                }`}
              >
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50 ${secondaryButtonClass}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2.5 font-semibold text-xs rounded-full shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${primaryButtonClass}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QADiagnosticModal isOpen={isQAModalOpen} onClose={() => setIsQAModalOpen(false)} />
    </div>
  );
};
