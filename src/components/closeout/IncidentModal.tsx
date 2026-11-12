import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Incident, Role } from '../../types';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, category: Incident['category']) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onAdd }) => {
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

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title="Registrar Incidencia">
      <div className="space-y-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Incident['category'])}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white"
        >
          <option value="caja">Caja / Descuadre de Efectivo</option>
          <option value="maquinaria">Maquinaria / Cafetera</option>
          <option value="inventario">Inventario / Insumos</option>
          <option value="otro">Otro</option>
        </select>
        <textarea
          rows={3}
          placeholder="Describe la incidencia o nota para el siguiente turno..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white"
        />
        <Button
          variant="primary"
          size="lg"
          disabled={isSubmitting || !text.trim()}
          isLoading={isSubmitting}
          className="w-full font-bold"
          onClick={handleSubmit}
        >
          Guardar Incidencia
        </Button>
      </div>
    </Modal>
  );
};
