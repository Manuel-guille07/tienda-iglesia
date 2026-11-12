import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { User } from '../../types';
import { UserAvatarIcon } from './UserAvatarIcon';
import { Badge } from './Badge';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
        className={`w-full min-h-[56px] px-4 py-3 rounded-3xl text-left flex items-center justify-between gap-3 transition cursor-pointer disabled:opacity-50 border ${
          isDark
            ? isOpen
              ? 'bg-[#211D1A] border-[#EFECE6] text-[#F4F0EA]'
              : 'bg-[#211D1A] border-[#2A2420] hover:border-[#3D352F] text-[#F4F0EA]'
            : isOpen
            ? 'bg-[#EFECE6] border-[#141210] text-[#141210]'
            : 'bg-[#EFECE6] border-[#E2DDD5] hover:border-[#CFC8BC] text-[#141210]'
        }`}
      >
        {activeUser ? (
          <div className="flex items-center gap-3.5 min-w-0">
            <UserAvatarIcon icon={activeUser.avatar} size="md" />
            <div className="min-w-0">
              <p className="text-base font-semibold truncate">{activeUser.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={getRoleBadgeVariant(activeUser.role)} size="sm">
                  {activeUser.role}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <span className={`text-sm ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
            Selecciona un usuario
          </span>
        )}

        <ChevronDown
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
            isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && users.length > 0 && (
        <div
          className={`absolute left-0 right-0 mt-2 rounded-3xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto border ${
            isDark
              ? 'bg-[#171412] border-[#2A2420] divide-y divide-[#2A2420]'
              : 'bg-[#FAF8F5] border-[#E2DDD5] divide-y divide-[#E2DDD5]'
          }`}
        >
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
                className={`w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                  isDark
                    ? isSelected
                      ? 'bg-[#211D1A] text-[#F4F0EA]'
                      : 'hover:bg-[#211D1A]/70 text-[#F4F0EA]'
                    : isSelected
                    ? 'bg-[#EFECE6] text-[#141210]'
                    : 'hover:bg-[#EFECE6]/70 text-[#141210]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <UserAvatarIcon icon={u.avatar} size="md" />
                  <div className="min-w-0">
                    <p className="text-base font-medium truncate">{u.name}</p>
                    <div className="mt-0.5">
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {u.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-[#EFECE6] text-[#141210]' : 'bg-[#141210] text-[#FAF8F5]'
                    }`}
                  >
                    <Check className="w-4 h-4" />
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
