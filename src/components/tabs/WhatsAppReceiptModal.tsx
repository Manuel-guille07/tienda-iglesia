import React, { useState } from 'react';
import { CustomerTab } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Copy, Check, MessageSquareShare } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerTab | null;
  abonoAmount?: number | null;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({
  isOpen,
  onClose,
  customer,
  abonoAmount,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { generateReceiptText, getWhatsAppShareUrl } = useTabStore();
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const receiptText = generateReceiptText(customer, null, abonoAmount);

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    toast.success(t('tabs.receiptCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tabs.whatsappTitle')}>
      <div className="space-y-4">
        <pre
          className={`p-4 rounded-2xl border text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
          }`}
        >
          {receiptText}
        </pre>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? 'Copiado' : t('tabs.copyReceipt')}
          </Button>
          <a
            href={getWhatsAppShareUrl(customer.phone || '', receiptText)}
            target="_blank"
            rel="noreferrer"
            className="flex-1 min-h-[48px] px-4 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MessageSquareShare className="w-4 h-4" /> {t('tabs.openWhatsApp')}
          </a>
        </div>
      </div>
    </Modal>
  );
};
