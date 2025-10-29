import React from 'react';
import type { RecoveryTask } from '../types';

interface RecoveryChecklistProps {
  tasks: RecoveryTask[];
  onToggleTask: (taskId: number) => void;
}
export const RecoveryChecklist: React.FC<RecoveryChecklistProps> = ({ tasks, onToggleTask }) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <h3 className="text-base font-semibold text-gray-300 px-1">Recovery Checklist</h3>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onToggleTask(task.id)}
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:border-slate-600"
          style={{boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)'}}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-blue-500 border-blue-400' : 'border-slate-600'}`}>
              {task.completed && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className={`text-sm font-medium transition-colors ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.text}</span>
          </div>
          <span className="text-sm font-semibold text-emerald-400">{task.benefit}</span>
        </div>
      ))}
    </div>
  );
};
