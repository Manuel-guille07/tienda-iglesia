import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full ${maxWidths[maxWidth]} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors ${
          isDark
            ? 'bg-[#171412] border border-[#2A2420] text-[#F4F0EA]'
            : 'bg-[#FAF8F5] border border-[#E2DDD5] text-[#141210]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDark ? 'border-[#2A2420]' : 'border-[#E2DDD5]'
          }`}
        >
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            {description && (
              <p className={`text-sm mt-0.5 ${isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'}`}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
              isDark
                ? 'text-[#9A9086] hover:text-[#F4F0EA] hover:bg-[#211D1A]'
                : 'text-[#6E665E] hover:text-[#141210] hover:bg-[#EFECE6]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
