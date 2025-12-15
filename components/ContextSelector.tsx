import React from 'react';
import { UserContext, SeniorityLevel, RoleType } from '../types';
import { User, Briefcase, GraduationCap } from 'lucide-react';

interface ContextSelectorProps {
    context: UserContext;
    onChange: (newContext: UserContext) => void;
}

const ContextSelector: React.FC<ContextSelectorProps> = ({ context, onChange }) => {
    const seniorities: SeniorityLevel[] = ['Intern', 'Junior', 'Mid-Level', 'Senior'];
    const roles: RoleType[] = ['Frontend', 'Backend', 'Fullstack'];

    const handleSeniorityChange = (level: SeniorityLevel) => {
        onChange({ ...context, seniority: level });
    };

    const handleRoleChange = (role: RoleType) => {
        onChange({ ...context, role });
    };

    const toggleHRMode = () => {
        onChange({ ...context, isHRMode: !context.isHRMode });
    };

    return (
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-5 mb-6 animate-fade-in relative overflow-hidden">
            {/* Decorative accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-orange-500"></div>

            <div className="flex items-center gap-2 mb-5 text-slate-100 font-bold border-b border-slate-800 pb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <User size={20} />
                </div>
                <h2 className="text-lg">Contexto do Profissional</h2>
                <span className="text-xs font-normal text-slate-400 ml-auto border border-slate-700 px-2 py-1 rounded bg-slate-950/50">
                    Personalize o discurso da IA
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Seniority */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        <GraduationCap size={14} className="text-orange-500" /> Nível de Senioridade
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {seniorities.map(level => (
                            <button
                                key={level}
                                onClick={() => handleSeniorityChange(level)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${context.seniority === level
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Role */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        <Briefcase size={14} className="text-orange-500" /> Frente de Atuação
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {roles.map(role => (
                            <button
                                key={role}
                                onClick={() => handleRoleChange(role)}
                                disabled={context.isHRMode}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${context.role === role && !context.isHRMode
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : context.isHRMode
                                        ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* HR Toggle (Extra) */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative">
                        <input type="checkbox" checked={!!context.isHRMode} onChange={toggleHRMode} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-purple-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                    </div>
                    <span className={`text-sm font-medium transition-colors ${context.isHRMode ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        Modo Análise de RH <span className="text-xs opacity-70 font-normal">(Visão imparcial de performance)</span>
                    </span>
                </label>
            </div>

        </div>
    );
};

export default ContextSelector;
