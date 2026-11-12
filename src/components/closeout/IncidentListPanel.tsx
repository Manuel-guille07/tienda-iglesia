import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Incident } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface IncidentListPanelProps {
  incidents: Incident[];
  onOpenNew: () => void;
}

export const IncidentListPanel: React.FC<IncidentListPanelProps> = ({ incidents, onOpenNew }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 space-y-4 border ${
        isDark
          ? 'bg-[#171412] border-[#2A2420] text-[#F4F0EA]'
          : 'bg-[#FAF8F5] border-[#E2DDD5] text-[#141210]'
      }`}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Incidencias del Turno
        </h3>
        <Button variant="outline" size="sm" onClick={onOpenNew}>
          + Nueva Incidencia
        </Button>
      </div>

      {incidents.length === 0 ? (
        <div
          className={`p-6 rounded-2xl border text-center text-sm ${
            isDark
              ? 'bg-[#211D1A] border-[#2A2420] text-[#9A9086]'
              : 'bg-[#EFECE6] border-[#E2DDD5] text-[#6E665E]'
          }`}
        >
          No se han registrado incidencias en el turno actual.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {incidents.map((i) => (
            <div
              key={i.id}
              className={`p-3.5 rounded-2xl text-sm space-y-1 border ${
                isDark
                  ? 'bg-[#211D1A] border-[#2A2420] text-[#F4F0EA]'
                  : 'bg-[#EFECE6] border-[#E2DDD5] text-[#141210]'
              }`}
            >
              <div
                className={`flex justify-between text-xs ${
                  isDark ? 'text-[#9A9086]' : 'text-[#6E665E]'
                }`}
              >
                <span className="font-semibold">{i.author}</span>
                <span>
                  {new Date(i.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="leading-snug">{i.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
