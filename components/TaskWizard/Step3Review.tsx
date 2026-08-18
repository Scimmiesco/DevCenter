import React from "react";
import { Wand2, RotateCcw, Loader2, CheckCircle2, Save, GitCommit, Trash2 } from "lucide-react";
import { Task, KNOWLEDGE_BASE } from "./types";

interface Step3ReviewProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    loadingAi: boolean;
    refineWithAI: () => void;
    exportCsv: () => void;
    updateTask: (idx: number, field: keyof Task, val: any) => void;
    removeTask: (idx: number) => void;
    badgeColor: (c: string) => string;
    onBack: () => void;
    onReset: () => void;
    cancelAiProcessing?: () => void;
}

export const Step3Review: React.FC<Step3ReviewProps> = ({
    tasks,
    setTasks,
    loadingAi,
    refineWithAI,
    exportCsv,
    updateTask,
    removeTask,
    badgeColor,
    onBack,
    onReset,
    cancelAiProcessing,
}) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* WIZARD ACTIONS BAR */}
            <div className="flex items-center justify-between border border-emerald-500/30 p-4 rounded-xl bg-emerald-950/20 shadow-lg">
                <div>
                    <h3 className="text-emerald-400 font-bold flex items-center gap-2"><Wand2 size={20} /> Análise via IA</h3>
                    <p className="text-xs text-emerald-500/70 mt-1">Converse com a IA para estruturar as atividades.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-xs font-bold text-gray300 hover:text-white transition-colors bg-gray800 rounded-lg"
                    >
                        &larr; Voltar
                    </button>

                    <button
                        onClick={onReset}
                        className="px-4 py-2 text-xs font-bold text-accent bg-gray800 hover:bg-gray700 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RotateCcw size={14} /> Refazer
                    </button>
                    <button
                        onClick={refineWithAI}
                        disabled={loadingAi}
                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray950 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loadingAi ? (
                            <>
                                <Loader2 className="animate-spin" size={18} /> Processando IA...
                            </>
                        ) : (
                            <>
                                <Wand2 size={18} /> Iniciar IA
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* LOADING STATE - IF AI IS RUNNING */}
            {loadingAi && (
                <div className="flex flex-col items-center justify-center p-12 text-emerald-500">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="font-bold">A inteligência artificial está analisando as mudanças...</p>
                    <p className="text-xs opacity-70 mt-2 mb-6">Isso pode levar alguns segundos dependendo do tamanho do diff.</p>
                    {cancelAiProcessing && (
                        <button
                            onClick={cancelAiProcessing}
                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors border border-red-500/30"
                        >
                            Cancelar Processamento
                        </button>
                    )}
                </div>
            )}

            {/* RESULTS LIST */}
            {!loadingAi && tasks.length > 0 && (
                <div className="border-2 border-emerald-500/30 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/10">
                    <div className="p-4 bg-emerald-950/50 border-b border-emerald-500/30 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" size={18} />
                            Lista de Tarefas Estruturada{" "}
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                {tasks.length}
                            </span>
                        </h3>

                        <div className="flex gap-2">
                            <button
                                onClick={exportCsv}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray950 rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                            >
                                <Save size={14} /> Exportar CSV para Importação Azure
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 p-4">
                        {tasks.map((task, idx) => (
                            <div
                                key={idx}
                                className="bg-surface border border-gray800 rounded-xl p-4 shadow-sm hover:border-emerald-500/50 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-gray-950 rounded text-accent-light/70 font-mono text-xs border border-gray800">
                                        #{task.taskId}
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-gray700 focus:border-accent-light0 outline-none text-white font-semibold placeholder-gray600 transition-colors"
                                                value={task.customTitle}
                                                onChange={(e) =>
                                                    updateTask(idx, "customTitle", e.target.value)
                                                }
                                            />
                                            <span className="text-[10px] uppercase font-bold text-accent-light/70 tracking-wider self-center">
                                                {task.source}
                                            </span>
                                            {task.relatedCommitId && (
                                                <span className="text-[10px] items-center flex gap-1 font-mono text-emerald-400 bg-emerald-400/10 px-1 rounded border border-emerald-400/20" title={task.relatedCommitId}>
                                                    <GitCommit size={10} /> {task.relatedCommitId.substring(0, 7)}
                                                </span>
                                            )}
                                        </div>

                                        <textarea
                                            className="w-full bg-gray-950/50 rounded p-2 text-sm text-accent-light outline-none border border-transparent focus:border-gray700 resize-none"
                                            rows={2}
                                            value={task.coherentDescription}
                                            onChange={(e) =>
                                                updateTask(idx, "coherentDescription", e.target.value)
                                            }
                                        />

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-accent-light/70">
                                                    Categoria
                                                </label>
                                                <select
                                                    className="bg-gray-950 border border-gray800 rounded px-2 py-1 text-xs text-white outline-none"
                                                    value={task.kbIndex}
                                                    onChange={(e) =>
                                                        updateTask(idx, "kbIndex", parseInt(e.target.value))
                                                    }
                                                >
                                                    {KNOWLEDGE_BASE.map((k, i) => (
                                                        <option key={k.id} value={i}>
                                                            {k.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-accent-light/70">
                                                    Complexidade
                                                </label>
                                                <select
                                                    className={`bg-gray-950 border border-gray800 rounded px-2 py-1 text-xs outline-none font-bold ${task.complexity === "alta"
                                                        ? "text-red-400"
                                                        : task.complexity === "media"
                                                            ? "text-accent"
                                                            : "text-emerald-400"
                                                        }`}
                                                    value={task.complexity}
                                                    onChange={(e) =>
                                                        updateTask(idx, "complexity", e.target.value)
                                                    }
                                                >
                                                    {Object.keys(
                                                        KNOWLEDGE_BASE[task.kbIndex].complexities
                                                    ).map((c) => (
                                                        <option key={c} value={c}>
                                                            {c.toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-accent-light/70">
                                                    UST
                                                </label>
                                                <div
                                                    className={`px-2 py-1 rounded text-xs font-mono font-bold border ${badgeColor(
                                                        task.complexity
                                                    )}`}
                                                >
                                                    {task.ustPoints}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-accent-light/70">
                                                    Horas
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-16 bg-gray-950 border border-gray800 rounded px-2 py-1 text-xs text-center text-white"
                                                    value={task.estimateMade}
                                                    onChange={(e) =>
                                                        updateTask(
                                                            idx,
                                                            "estimateMade",
                                                            parseFloat(e.target.value)
                                                        )
                                                    }
                                                />
                                            </div>

                                            <button
                                                onClick={() => removeTask(idx)}
                                                className="ml-auto text-accent-light/70 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
