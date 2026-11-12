import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTabStore } from '../../store/useTabStore';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

export const NewCustomerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { addCustomer } = useTabStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+34');
  const [group, setGroup] = useState('Congregación');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = () => {
    if (isSubmitting) return;
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('El nombre del cliente no puede estar vacío');
      return;
    }
    setIsSubmitting(true);
    try {
      addCustomer(cleanName, phone.trim(), group.trim() || 'Congregación');
      toast.success(t('toast.customerAdded'));
      setName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={t('tabs.newCustomer')}>
      <div className="space-y-2">
        <input type="text" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-sm text-white" />
        <input type="text" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-sm text-white" />
        <input type="text" placeholder="Ministerio" value={group} onChange={(e) => setGroup(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-sm text-white" />
        <Button variant="primary" size="lg" disabled={isSubmitting} isLoading={isSubmitting} className="w-full font-bold mt-2" onClick={handleCreate}>Crear</Button>
      </div>
    </Modal>
  );
};
