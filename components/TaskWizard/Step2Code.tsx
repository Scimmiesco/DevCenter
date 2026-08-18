import React from "react";
import { Loader2, Search, RefreshCcw, Download, Play } from "lucide-react";
import { fetchRecentCommitsForRepo } from "../../services/azure";
import { AzureRepository } from "../../types";

interface Step2CodeProps {
    config: any;
    setConfig: React.Dispatch<React.SetStateAction<any>>;
    diffInput: string;
    setDiffInput: (val: string) => void;
    azureConfig: any;
    selectedRepos: AzureRepository[];
    selectedRepoId: string;
    setSelectedRepoId: (val: string) => void;
    filterAuthor: string;
    setFilterAuthor: (val: string) => void;
    recentCommits: any[];
    setRecentCommits: (val: any[]) => void;
    selectedCommitIds: string[];
    handleCommitSelect: (id: string) => void;
    loading: boolean;
    setLoading: (val: boolean) => void;
    fetchAzure: () => void;
    setStatusMsg: (val: any) => void;
    onBack: () => void;
    onNext: () => void;
    processHeuristic: () => void;
}

export const Step2Code: React.FC<Step2CodeProps> = ({
    config,
    setConfig,
    diffInput,
    setDiffInput,
    azureConfig,
    selectedRepos,
    selectedRepoId,
    setSelectedRepoId,
    filterAuthor,
    setFilterAuthor,
    recentCommits,
    setRecentCommits,
    selectedCommitIds,
    handleCommitSelect,
    loading,
    setLoading,
    fetchAzure,
    setStatusMsg,
    onBack,
    onNext,
    processHeuristic,
}) => {
    const [repoSearch, setRepoSearch] = React.useState("");
    const [repoDropdownOpen, setRepoDropdownOpen] = React.useState(false);

    const filteredRepos = selectedRepos?.filter(r => 
        `${r.project.name} / ${r.name}`.toLowerCase().includes(repoSearch.toLowerCase())
    ) || [];

    const selectedRepoName = selectedRepos?.find(r => r.id === selectedRepoId)
        ? `${selectedRepos.find(r => r.id === selectedRepoId)!.project.name} / ${selectedRepos.find(r => r.id === selectedRepoId)!.name}`
        : "Selecione um repositório...";
    return (
        <div className="border border-gray800 rounded-xl overflow-hidden shadow-sm bg-surface-muted animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-gray800 bg-gray-900/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-accent-light flex items-center gap-2">
                        Identificar Alterações (Código)
                    </h3>
                    <p className="text-xs text-gray400 mt-1">Busque de um Commit do Azure ou cole o Diff manualmente.</p>
                </div>
                <button
                    onClick={onBack}
                    className="text-xs font-bold text-gray400 hover:text-white transition-colors px-3 py-1 bg-gray800 rounded"
                >
                    &larr; Voltar
                </button>
            </div>

            <div className="p-4 space-y-6">
                <div className="flex ">
                    {/* SOURCE: AZURE PR/COMMITS (Live Data) */}
                    <div className="border border-accent/20 rounded-lg p-3 bg-surface shadow-inner flex flex-col gap-3 relative overflow-hidden w-full">
                        <div className="absolute top-0 right-0 p-2 opacity-10 text-accent">
                            <RefreshCcw size={64} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray800">
                                <span className="font-bold text-accent-light text-sm uppercase">Azure DevOps</span>
                                {loading && <Loader2 className="animate-spin text-accent" size={14} />}
                            </div>

                            {azureConfig && selectedRepos && selectedRepos.length > 0 ? (
                                <>
                                    <div className="flex flex-col gap-1 mb-3 relative">
                                        <label className="text-[10px] font-bold uppercase text-accent-light/70">
                                            Repositório Selecionado
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full bg-gray-900 border border-gray700 rounded p-2 text-xs text-white focus:border-accent-light0 outline-none"
                                                placeholder="Buscar repositório..."
                                                value={repoDropdownOpen ? repoSearch : selectedRepoName}
                                                onChange={(e) => {
                                                    setRepoSearch(e.target.value);
                                                    setRepoDropdownOpen(true);
                                                }}
                                                onFocus={() => {
                                                    setRepoSearch("");
                                                    setRepoDropdownOpen(true);
                                                }}
                                                onBlur={() => setTimeout(() => setRepoDropdownOpen(false), 200)}
                                            />
                                            {repoDropdownOpen && (
                                                <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-gray-900 border border-gray700 rounded shadow-lg custom-scrollbar">
                                                    {filteredRepos.length > 0 ? (
                                                        filteredRepos.map((repo) => (
                                                            <div
                                                                key={repo.id}
                                                                className="p-2 text-xs text-white hover:bg-accent/80 hover:text-white cursor-pointer transition-colors"
                                                                onClick={() => {
                                                                    setSelectedRepoId(repo.id);
                                                                    setRepoSearch("");
                                                                    setRepoDropdownOpen(false);
                                                                }}
                                                            >
                                                                {repo.project.name} / {repo.name}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-xs text-gray-500">Nenhum repositório encontrado</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ADVANCED COMMIT SELECTOR */}
                                    <div className="flex flex-col gap-2 border border-accent/20 rounded-md p-2 bg-gray-950/50">
                                        <label className="text-[10px] font-bold uppercase text-accent-light/70 mb-1 flex justify-between items-center">
                                            <span>Selecione um Commit</span>
                                            <span className="text-[10px] normal-case bg-accent/10 px-1 rounded text-accent">
                                                {recentCommits.length} recentes
                                            </span>
                                        </label>

                                        <div className="flex gap-2 mb-2">
                                            <select
                                                className="bg-gray-900 border border-gray700 rounded p-1.5 text-[10px] text-white flex-1 outline-none focus:border-accent"
                                                value={filterAuthor}
                                                onChange={(e) => {
                                                    const author = e.target.value;
                                                    setFilterAuthor(author);
                                                    const repo = selectedRepos.find((r) => r.id === selectedRepoId);
                                                    if (repo) {
                                                        setLoading(true);
                                                        fetchRecentCommitsForRepo(azureConfig.org, repo.project.name, repo.id, azureConfig.token, 0, 20, author)
                                                            .then(setRecentCommits)
                                                            .finally(() => setLoading(false));
                                                    }
                                                }}
                                            >
                                                <option value="">Qualquer Autor</option>
                                                {azureConfig.aliases?.map((alias: string) => (
                                                    <option key={alias} value={alias}>Meus Commits ({alias})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar">
                                            {recentCommits.length === 0 && !loading ? (
                                                <div className="text-center p-4 text-xs text-gray500">Nenhum commit encontrado.</div>
                                            ) : (
                                                recentCommits.map((c: any) => (
                                                    <div
                                                        key={c.commitId}
                                                        onClick={() => handleCommitSelect(c.commitId)}
                                                        className={`p-2 rounded cursor-pointer border transition-all ${selectedCommitIds.includes(c.commitId)
                                                            ? "bg-accent/20 border-accent text-white"
                                                            : "bg-gray-900 border-gray800 text-gray-400 hover:bg-gray-800 hover:text-white"
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start gap-2">
                                                            <span className="text-[10px] font-mono text-emerald-400 shrink-0 mt-0.5">
                                                                {c.commitId.substring(0, 7)}
                                                            </span>
                                                            <span className="text-xs font-semibold truncate flex-1" title={c.comment}>
                                                                {c.comment}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between mt-1 items-center">
                                                            <span className="text-[9px] text-gray500 truncate max-w-[120px]">{c.author}</span>
                                                            <span className="text-[9px] text-gray500">{new Date(c.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={fetchAzure}
                                        disabled={loading || selectedCommitIds.length === 0}
                                        className={`w-full py-2.5 mt-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-2 ${selectedCommitIds.length > 0
                                            ? "bg-accent hover:bg-accent-light text-surface"
                                            : "bg-gray800 text-gray500 cursor-not-allowed"
                                            }`}
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                        Buscar Diffs ({selectedCommitIds.length})
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <p className="text-xs text-accent-light/70">
                                        Conecte-se ao Azure no Menu Principal primeiro.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MANUAL DIFF INPUT */}
                <div className="flex flex-col gap-2 mt-4">
                    <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold uppercase text-accent-light/70">
                            Diff Encontrado / Inserido Manualmente
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={async () => {
                                    setStatusMsg({ msg: "Buscando Diff Local...", type: "neutral" });
                                    try {
                                        const res = await fetch("/api/local-diff");
                                        const data = await res.json();
                                        if (data.error) throw new Error(data.error);
                                        if (!data.diff) throw new Error("Sem alterações locais não comitadas.");
                                        setDiffInput(data.diff);
                                        setStatusMsg({ msg: "Diff Local (Git Local) copiado com sucesso.", type: "success" });
                                    } catch (e: any) {
                                        setStatusMsg({ msg: "Erro: " + e.message, type: "error" });
                                    }
                                }}
                                className="cursor-pointer px-2 py-1 rounded bg-gray800 text-[10px] font-bold uppercase text-accent hover:bg-gray700 transition-colors flex items-center gap-1"
                            >
                                <Download size={12} />
                                Ler Git Local
                            </button>
                            <label className="cursor-pointer px-2 py-1 rounded bg-gray800 text-[10px] font-bold uppercase text-accent hover:bg-gray700 transition-colors flex items-center gap-1">
                                <Download size={12} />
                                Carregar Arquivo Local
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".txt,.diff,.patch"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const content = event.target?.result as string;
                                            if (content) {
                                                setDiffInput(content);
                                                setStatusMsg({
                                                    msg: `Arquivo ${file.name} carregado com sucesso!`,
                                                    type: "success",
                                                });
                                            }
                                        };
                                        reader.onerror = () => {
                                            setStatusMsg({
                                                msg: `Erro ao ler o arquivo ${file.name}.`,
                                                type: "error",
                                            });
                                        };
                                        reader.readAsText(file);
                                        e.target.value = "";
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    <textarea
                        className="w-full h-48 bg-gray-950 border border-gray800 rounded-lg p-3 text-sm font-mono text-emerald-400 focus:ring-2 focus:ring-accent-light0/50 outline-none resize-none custom-scrollbar"
                        placeholder="Conteúdo do .diff virá aqui..."
                        value={diffInput}
                        rows={20}
                        onChange={(e) => setDiffInput(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onNext}
                        className="w-full px-6 py-3 bg-accent hover:bg-accent-light text-surface rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        Gerar tarefas &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};
