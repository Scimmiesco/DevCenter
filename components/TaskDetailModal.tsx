
import { X, Calendar, User, GitPullRequest, ExternalLink, Briefcase } from 'lucide-react';

interface TaskDetailModalProps {
    task: {
        id: string;
        title: string;
        description: string;
        createdBy: string;
        sprint: string;
        url: string;
        type: string;
        parent?: {
            id: string;
            title: string;
            type: string;
        };
    };
    onClose: () => void;
}

export const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg shadow-blue-500/20 uppercase tracking-wide">
                                {task.type} {task.id}
                            </span>
                            <span className="text-slate-500 text-sm flex items-center gap-1">
                                <Calendar size={14} />
                                {task.sprint}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight">
                            {task.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Parent Context */}
                    {task.parent && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Briefcase size={12} />
                                Item Pai (Parent Context)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                                    {task.parent.type} {task.parent.id}
                                </span>
                                <span className="text-slate-300 font-medium truncate">
                                    {task.parent.title}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                            Descrição
                        </h3>
                        <div
                            className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none prose-sm bg-slate-950/30 p-4 rounded-lg border border-slate-800"
                            dangerouslySetInnerHTML={{ __html: task.description || '<p class="text-slate-500 italic">Sem descrição.</p>' }}
                        />
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                            <span className="text-xs text-slate-500 block mb-1">Criado por</span>
                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                <User size={14} />
                                {task.createdBy}
                            </div>
                        </div>
                        <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 hover:bg-slate-800 hover:border-blue-500/50 transition-all group"
                        >
                            <span className="text-xs text-slate-500 block mb-1">Ver no Azure DevOps</span>
                            <div className="flex items-center gap-2 text-blue-400 text-sm group-hover:text-blue-300">
                                <ExternalLink size={14} />
                                Abrir Link Externo
                            </div>
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
