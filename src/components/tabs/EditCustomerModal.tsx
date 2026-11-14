import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CustomerTab } from '../../types';
import { useTabStore } from '../../store/useTabStore';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerTab | null;
  onUpdated?: (updated: CustomerTab) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onUpdated,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { updateCustomer } = useTabStore();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [congregation, setCongregation] = useState<string>('');
  const [ministry, setMinistry] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && customer) {
      setName(String(customer.name ?? ''));
      setPhone(String(customer.phone ?? ''));
      const rawCongregation = String(customer.congregation ?? '');
      const rawMinistry = String(customer.ministry ?? '');
      const rawGroup = String(customer.churchGroup ?? '');

      if (!rawCongregation && !rawMinistry && rawGroup) {
        if (rawGroup.includes('·')) {
          const [cPart, mPart] = rawGroup.split('·').map((s) => s.trim());
          setCongregation(cPart || '');
          setMinistry(mPart || '');
        } else if (rawGroup.toLowerCase() === 'congregación' || rawGroup.toLowerCase() === 'congregacion') {
          setCongregation('Congregación');
          setMinistry('');
        } else {
          setCongregation('Congregación');
          setMinistry(rawGroup);
        }
      } else {
        setCongregation(rawCongregation);
        setMinistry(rawMinistry);
      }
    }
  }, [isOpen, customer]);

  if (!customer) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    const cleanName = (name ?? '').trim();
    if (!cleanName) {
      toast.error('El nombre del hermano/a no puede estar vacío');
      return;
    }

    const cleanPhone = (phone ?? '').trim();
    const cleanCongregation = (congregation ?? '').trim();
    const cleanMinistry = (ministry ?? '').trim();
    const composedGroup =
      [cleanCongregation, cleanMinistry].filter(Boolean).join(' · ') || 'Congregación';

    setIsSubmitting(true);
    try {
      const res = await updateCustomer(customer.id, {
        name: cleanName,
        phone: cleanPhone,
        congregation: cleanCongregation,
        ministry: cleanMinistry,
        churchGroup: composedGroup,
      });

      if (res.success && res.customer) {
        toast.success('Perfil del hermano/a actualizado correctamente');
        onUpdated?.(res.customer);
        onClose();
      } else {
        toast.error(res.error || 'No se pudo actualizar el perfil');
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
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Editar Perfil · ${customer.name}`}
    >
      <div className="space-y-3.5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Congregación</label>
            <input
              type="text"
              placeholder="Ej. Central, Norte..."
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Ministerio / Grupo</label>
            <input
              type="text"
              placeholder="Ej. Alabanza, Jóvenes..."
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={isSubmitting || !(name ?? '').trim()}
            isLoading={isSubmitting}
            className="flex-1"
            onClick={handleSave}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
};
