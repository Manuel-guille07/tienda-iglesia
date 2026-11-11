import React, { useState } from 'react';
import { CustomerTab } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { Copy, Check, MessageSquareShare } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerTab | null;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({ isOpen, onClose, customer }) => {
  const { t } = useLanguage();
  const { generateReceiptText, getWhatsAppShareUrl } = useTabStore();
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const receiptText = generateReceiptText(customer);

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    toast.success(t('tabs.receiptCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tabs.whatsappTitle')}>
      <div className="space-y-3">
        <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
          {receiptText}
        </pre>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-xs font-semibold"
            icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? 'Copiado' : t('tabs.copyReceipt')}
          </Button>
          <a
            href={getWhatsAppShareUrl(customer.phone, receiptText)}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <MessageSquareShare className="w-4 h-4" /> {t('tabs.openWhatsApp')}
          </a>
        </div>
      </div>
    </Modal>
  );
};
