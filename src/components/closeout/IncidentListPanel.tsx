import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Incident } from '../../types';

interface IncidentListPanelProps {
  incidents: Incident[];
  onOpenNew: () => void;
}

export const IncidentListPanel: React.FC<IncidentListPanelProps> = ({ incidents, onOpenNew }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-400" /> Incidencias
        </h3>
        <Button variant="outline" size="sm" onClick={onOpenNew}>+ Nueva</Button>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {incidents.map((i) => (
          <div key={i.id} className="bg-slate-800/60 p-2 rounded-xl text-xs space-y-0.5 border border-slate-700/50">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span className="font-bold text-indigo-300">{i.author}</span>
              <span>{new Date(i.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-slate-200">{i.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
