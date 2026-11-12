import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Incident } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, category: Incident['category']) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [text, setText] = useState('');
  const [category, setCategory] = useState<Incident['category']>('caja');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (isSubmitting || !text.trim()) return;
    setIsSubmitting(true);
    try {
      onAdd(text.trim(), category);
      setText('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = `w-full rounded-2xl p-3.5 text-base border focus:outline-none ${
    isDark
      ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA] placeholder-[#9A9086] focus:border-[#EFECE6]'
      : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210] placeholder-[#6E665E] focus:border-[#141210]'
  }`;

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title="Registrar Incidencia">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Incident['category'])}
            className={`${inputClasses} min-h-[48px]`}
          >
            <option value="caja">Caja / Descuadre de Efectivo</option>
            <option value="maquinaria">Maquinaria / Cafetera</option>
            <option value="inventario">Inventario / Insumos</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Descripción</label>
          <textarea
            rows={3}
            placeholder="Describe la incidencia o nota para el siguiente turno..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClasses}
          />
        </div>

        <Button
          variant="primary"
          size="xl"
          disabled={isSubmitting || !text.trim()}
          isLoading={isSubmitting}
          className="w-full"
          onClick={handleSubmit}
        >
          Guardar Incidencia
        </Button>
      </div>
    </Modal>
  );
};
