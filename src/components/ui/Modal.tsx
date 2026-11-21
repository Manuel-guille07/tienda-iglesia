import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] border border-[var(--ql-hairline)] bg-[var(--ql-bg-card)] text-[var(--ql-text-primary)] [box-shadow:var(--ql-inner-highlight),var(--ql-shadow-lg)] transition-colors',
          maxWidths[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--ql-hairline)] shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight truncate">{title}</h3>
            {description && (
              <p className="text-xs sm:text-sm mt-0.5 text-[var(--ql-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-[var(--ql-bg-elevated)] border border-[var(--ql-hairline)] text-[var(--ql-text-secondary)] hover:text-[var(--ql-text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 ql-focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 pb-safe sm:pb-6 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
