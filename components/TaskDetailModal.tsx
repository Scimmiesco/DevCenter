
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
                className="bg-gray900 w-full max-w-2xl rounded-2xl border border-gray700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray800 flex justify-between items-start bg-gray950/50">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg shadow-accent-light0/20 uppercase tracking-wide">
                                {task.type} {task.id}
                            </span>
                            <span className="text-accent-light/70 text-sm flex items-center gap-1">
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
                        className="text-accent-light/70 hover:text-white hover:bg-gray800 p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Parent Context */}
                    {task.parent && (
                        <div className="bg-gray800/50 rounded-xl p-4 border border-gray700/50">
                            <h3 className="text-xs font-bold text-accent-light/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Briefcase size={12} />
                                Item Pai (Parent Context)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-accent-light/70 bg-gray800 px-1 py-0.5 rounded border border-gray700">
                                    {task.parent.type} {task.parent.id}
                                </span>
                                <span className="text-accent-light font-medium truncate">
                                    {task.parent.title}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-accent-light/70 flex items-center gap-2">
                            Descrição
                        </h3>
                        <div
                            className="text-accent-light text-sm leading-relaxed prose prose-invert max-w-none prose-sm bg-gray950/30 p-4 rounded-lg border border-gray800"
                            dangerouslySetInnerHTML={{ __html: task.description || '<p class="text-accent-light/70 italic">Sem descrição.</p>' }}
                        />
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray950/50 p-3 rounded-lg border border-gray800">
                            <span className="text-xs text-accent-light/70 block mb-1">Criado por</span>
                            <div className="flex items-center gap-2 text-accent-light text-sm">
                                <User size={14} />
                                {task.createdBy}
                            </div>
                        </div>
                        <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray950/50 p-3 rounded-lg border border-gray800 hover:bg-gray800 hover:border-accent-light0/50 transition-all group"
                        >
                            <span className="text-xs text-accent-light/70 block mb-1">Ver no Azure DevOps</span>
                            <div className="flex items-center gap-2 text-accent text-sm group-hover:text-accent-light">
                                <ExternalLink size={14} />
                                Abrir Link Externo
                            </div>
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray950 border-t border-gray800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray800 hover:bg-gray700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
