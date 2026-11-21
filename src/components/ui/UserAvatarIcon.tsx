import React from 'react';
import { User, Coffee, Crown, Shield, Wallet, Heart } from 'lucide-react';
import { cn } from '../../lib/cn';

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
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: 'mineral' | 'neutral';
  className?: string;
}

export const UserAvatarIcon: React.FC<UserAvatarIconProps> = ({
  icon,
  size = 'md',
  tone = 'mineral',
  className = '',
}) => {
  const key = sanitizeAvatarKey(icon);

  const containerSize =
    size === 'xs'
      ? 'w-5 h-5 rounded-md'
      : size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : 'w-9 h-9 rounded-xl';

  const iconSize =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'lg'
      ? 'w-6 h-6'
      : 'w-4 h-4';

  const colorStyle =
    tone === 'neutral'
      ? 'bg-[var(--ql-bg-muted)] border-[var(--ql-hairline)] text-[var(--ql-text-secondary)]'
      : (() => {
          switch (key) {
            case 'coffee':
              return 'bg-[var(--ql-tone-amber-soft)] border-[var(--ql-hairline)] text-[var(--ql-tone-amber)]';
            case 'crown':
              return 'bg-[var(--ql-tone-plum-soft)] border-[var(--ql-hairline)] text-[var(--ql-tone-plum)]';
            case 'shield':
              return 'bg-[var(--ql-bg-muted)] border-[var(--ql-hairline)] text-[var(--ql-text-primary)]';
            case 'wallet':
              return 'bg-[var(--ql-tone-sage-soft)] border-[var(--ql-hairline)] text-[var(--ql-tone-sage)]';
            case 'heart':
              return 'bg-[var(--ql-tone-terracotta-soft)] border-[var(--ql-hairline)] text-[var(--ql-tone-terracotta)]';
            case 'user':
            default:
              return 'bg-[var(--ql-tone-slate-soft)] border-[var(--ql-hairline)] text-[var(--ql-tone-slate)]';
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
      className={cn(
        'inline-flex items-center justify-center border shrink-0 transition-colors',
        containerSize,
        colorStyle,
        className
      )}
    >
      {renderIcon()}
    </div>
  );
};
