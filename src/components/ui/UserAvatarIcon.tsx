import React from 'react';
import { User, Coffee, Crown, Shield, Wallet, Heart } from 'lucide-react';

export const AVATAR_ICON_KEYS = ['user', 'coffee', 'crown', 'shield', 'wallet', 'heart'] as const;
export type AvatarIconKey = (typeof AVATAR_ICON_KEYS)[number];

export interface AvatarOption {
  key: AvatarIconKey;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { key: 'user', label: 'Usuario' },
  { key: 'coffee', label: 'Cafetería' },
  { key: 'crown', label: 'Liderazgo' },
  { key: 'shield', label: 'Seguridad' },
  { key: 'wallet', label: 'Tesorería' },
  { key: 'heart', label: 'Servicio' },
];

/**
 * Sanitizes any avatar string (URLs, emojis, empty values) into a valid Lucide icon key.
 * Defaults strictly to 'user'.
 */
export function sanitizeAvatarKey(raw?: string | null): AvatarIconKey {
  if (!raw || typeof raw !== 'string') return 'user';
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned.startsWith('http')) return 'user';
  if ((AVATAR_ICON_KEYS as readonly string[]).includes(cleaned)) {
    return cleaned as AvatarIconKey;
  }
  return 'user';
}

interface UserAvatarIconProps {
  icon?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatarIcon: React.FC<UserAvatarIconProps> = ({
  icon,
  size = 'md',
  className = '',
}) => {
  const key = sanitizeAvatarKey(icon);

  const containerSize =
    size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : 'w-9 h-9 rounded-xl';

  const iconSize =
    size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'lg'
      ? 'w-6 h-6'
      : 'w-4 h-4';

  const colorStyle = (() => {
    switch (key) {
      case 'coffee':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
      case 'crown':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-400';
      case 'shield':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400';
      case 'wallet':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
      case 'heart':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-400';
      case 'user':
      default:
        return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400';
    }
  })();

  const renderIcon = () => {
    switch (key) {
      case 'coffee':
        return <Coffee className={iconSize} />;
      case 'crown':
        return <Crown className={iconSize} />;
      case 'shield':
        return <Shield className={iconSize} />;
      case 'wallet':
        return <Wallet className={iconSize} />;
      case 'heart':
        return <Heart className={iconSize} />;
      case 'user':
      default:
        return <User className={iconSize} />;
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center border shrink-0 transition-colors ${containerSize} ${colorStyle} ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
