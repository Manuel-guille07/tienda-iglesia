import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { User } from '../../types';
import { UserAvatarIcon } from './UserAvatarIcon';
import { Badge } from './Badge';

interface UserSelectDropdownProps {
  users: User[];
  selectedUser: User | null;
  onSelect: (user: User) => void;
  disabled?: boolean;
}

export const UserSelectDropdown: React.FC<UserSelectDropdownProps> = ({
  users,
  selectedUser,
  onSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'success';
      case 'Pastor':
        return 'purple';
      case 'Tesorería':
        return 'warning';
      default:
        return 'info';
    }
  };

  const activeUser = selectedUser || users[0] || null;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled || users.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-950 border ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-700'
        } rounded-2xl text-left flex items-center justify-between gap-3 transition cursor-pointer shadow-inner disabled:opacity-50`}
      >
        {activeUser ? (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatarIcon icon={activeUser.avatar} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{activeUser.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={getRoleBadgeVariant(activeUser.role)} size="sm">
                  {activeUser.role}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Selecciona un usuario</span>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && users.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 py-1.5 z-50 max-h-64 overflow-y-auto divide-y divide-slate-800/60">
          {users.map((u) => {
            const isSelected = activeUser?.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/15 text-white'
                    : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatarIcon icon={u.avatar} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                    <div className="mt-0.5">
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {u.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
