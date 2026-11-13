import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

export const NewCustomerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { addCustomer } = useTabStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+34');
  const [group, setGroup] = useState('Congregación');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('El nombre del cliente no puede estar vacío');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await addCustomer(cleanName, phone.trim(), group.trim() || 'Congregación');
      if (res.success) {
        toast.success(t('toast.customerAdded'));
        setName('');
        onClose();
      } else {
        toast.error(res.error || 'Error de red al guardar el cliente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = `w-full min-h-[48px] rounded-2xl px-4 py-2.5 text-base border focus:outline-none ${
    isDark
      ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] placeholder-[#9A9086] focus:border-[#EFECE6]'
      : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]'
  }`;

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={t('tabs.newCustomer')}>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium block mb-1">Nombre completo</label>
          <input
            type="text"
            placeholder="Nombre y apellidos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Teléfono (WhatsApp)</label>
          <input
            type="text"
            placeholder="+34 600 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Ministerio / Grupo</label>
          <input
            type="text"
            placeholder="Congregación"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={inputClasses}
          />
        </div>
        <Button
          variant="primary"
          size="xl"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="w-full mt-2"
          onClick={handleCreate}
        >
          Guardar Cliente
        </Button>
      </div>
    </Modal>
  );
};
