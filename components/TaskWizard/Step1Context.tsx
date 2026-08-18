import React from "react";

interface Step1ContextProps {
    config: any;
    setConfig: React.Dispatch<React.SetStateAction<any>>;
    descInput: string;
    setDescInput: (val: string) => void;
    areaPaths: string[];
    contractItems: { id: string; title: string }[];
    onNext: () => void;
    onSkipCode?: () => void;
}

export const Step1Context: React.FC<Step1ContextProps> = ({
    config,
    setConfig,
    descInput,
    setDescInput,
    areaPaths,
    contractItems,
    onNext,
    onSkipCode,
}) => {
    return (
        <div className="border border-gray800 rounded-xl overflow-hidden shadow-sm bg-surface-muted animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-gray800 bg-gray-900/50">
                <h3 className="font-bold text-accent-light flex items-center gap-2">
                    Contexto da Atividade
                </h3>
                <p className="text-xs text-gray400 mt-1">Preencha os dados básicos que serão atrelados a todas as tarefas criadas.</p>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-accent-light/70 mb-1 block">
                            Assigned To
                        </label>
                        <input
                            type="text"
                            className="w-full bg-gray-950 border border-gray800 rounded p-2 text-sm text-white"
                            value={config.assignedTo}
                            onChange={(e) =>
                                setConfig({ ...config, assignedTo: e.target.value })
                            }
                        />
                    </div>
                    <div className="relative">
                        <label className="text-xs font-bold uppercase text-accent-light/70 mb-1 block">
                            Iteration Path <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-gray-950 border border-gray800 rounded p-2 text-sm text-white"
                            placeholder="ex: 35"
                            value={config.iterationPath}
                            onChange={(e) =>
                                setConfig({ ...config, iterationPath: e.target.value })
                            }
                        />
                    </div>
                    <div className="md:col-span-2 relative">
                        <label className="text-xs font-bold uppercase text-accent-light/70 mb-1 block">
                            Item Contrato <span className="text-red-400">*</span>
                        </label>
                        <input
                            list="contract-items"
                            className="w-full bg-gray-950 border border-gray800 rounded p-2 text-sm text-white"
                            placeholder="Selecione ou digite..."
                            value={config.contractItem}
                            onChange={(e) => setConfig({ ...config, contractItem: e.target.value })}
                        />
                        <datalist id="contract-items">
                            {contractItems.map((item) => (
                                <option key={item.id} value={`${item.id} - ${item.title}`} />
                            ))}
                            <option value="60 - 2 a 12 horas"></option>
                            <option value="61 - 12 a 24 horas"></option>
                            <option value="62 - Mais de 24 horas"></option>
                        </datalist>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-bold uppercase text-accent-light/70 mb-1 block mt-2">
                        Area Path <span className="text-red-400">*</span>
                    </label>
                    <input
                        list="area-paths"
                        className="w-full bg-gray-950 border border-gray800 rounded p-2 text-sm text-white"
                        placeholder="Selecione ou digite (ex: SPF-SIAFIC\Refatoração)..."
                        value={config.areaPath}
                        onChange={(e) => setConfig({ ...config, areaPath: e.target.value })}
                    />
                    <datalist id="area-paths">
                        {areaPaths.map((path) => (
                            <option key={path} value={path} />
                        ))}
                        <option value="SPF-SIAFIC\Refatoração"></option>
                        <option value="SPF-SIAFIC\SPF Fábrica"></option>
                        <option value="SPF-SIAFIC\SIAFIC Asp.Net Core"></option>
                    </datalist>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <label className="text-[10px] font-bold uppercase text-accent-light/70">
                        Descrição Técnica (Opcional - Usado como contexto)
                    </label>
                    <textarea
                        className="w-full h-24 bg-gray-950 border border-gray800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent-light0/50 outline-none resize-none text-white font-mono"
                        placeholder="Descreva o que foi feito de forma geral..."
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                    />
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray800">
                    <button
                        onClick={onSkipCode}
                        className="px-6 py-2 bg-accent hover:bg-accent-light text-surface rounded-xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        Pular Código (Apenas Descrição) &rarr;
                    </button>
                    <button
                        onClick={onNext}
                        className="px-6 py-2 bg-accent hover:bg-accent-light text-surface rounded-xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        Analisar Código &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};
