import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Calendar, GitCommit, GitBranch, FolderGit2, Tag, FileText, Loader2, FilePlus, FileEdit, FileMinus, FileCode } from 'lucide-react';
import { CategorizedCommit, Provider, CommitFileChange } from '../types';
import { getCategoryEmoji, getCategoryLabel } from '../utils/analyzer';
import { fetchGitHubCommit } from '../services/github';
import { fetchAzureCommit } from '../services/azure';

interface CommitDetailModalProps {
    commit: CategorizedCommit;
    onClose: () => void;
    provider: Provider;
    token?: string;
}

const CommitDetailModal: React.FC<CommitDetailModalProps> = ({ commit: initialCommit, onClose, provider, token }) => {
    // Cast initial commit to include changes property
    const [commit, setCommit] = useState<CategorizedCommit & { changes?: CommitFileChange[] }>(initialCommit);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                let details: any;
                console.log(`🔍 [Modal] Fetching details for ${initialCommit.sha} via ${provider}`);

                if (provider === 'github') {
                    // GitHub: owner/repo/commits/sha
                    const match = initialCommit.url.match(/github\.com\/([^/]+)\/([^/]+)/);
                    if (match) {
                        const owner = match[1];
                        const repo = match[2];
                        details = await fetchGitHubCommit(owner, repo, initialCommit.sha, token);

                        if (details) {
                            setCommit(prev => ({
                                ...prev,
                                message: details.commit.message.split('\n')[0],
                                fullMessage: details.commit.message,
                                body: details.commit.message.split('\n').slice(1).join('\n').trim(),
                                changes: details.changes || []
                            }));
                        }
                    }
                } else {
                    // Azure
                    if (initialCommit.url) {
                        details = await fetchAzureCommit(initialCommit.url, initialCommit.sha, token || '');

                        if (details) {
                            setCommit(prev => ({
                                ...prev,
                                message: details.comment.split('\n')[0],
                                fullMessage: details.comment,
                                body: details.comment.split('\n').slice(1).join('\n').trim(),
                                changes: details.changes || []
                            }));
                        }
                    }
                }
            } catch (err: any) {
                console.error("❌ [Modal] Error fetching details:", err);
                setError("Não foi possível carregar os detalhes completos.");
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [initialCommit.sha, provider, token, initialCommit.url]);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-800 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl filter drop-shadow-md" role="img" aria-label={commit.category}>
                            {getCategoryEmoji(commit.category)}
                        </span>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white">Detalhes do Commit</h2>
                                {loading && <Loader2 size={18} className="animate-spin text-blue-500" />}
                            </div>
                            <p className="text-sm text-slate-400 font-medium mt-0.5">{getCategoryLabel(commit.category)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar-dark">

                    {/* Main Message */}
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold text-white leading-snug mb-3">
                            {commit.message}
                        </h3>
                        {/* Body / Description */}
                        <div className={`bg-slate-950 rounded-xl p-5 border border-slate-800 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono ${loading ? 'opacity-50' : ''}`}>
                            {commit.body || <span className="text-slate-500 italic">Nenhuma descrição detalhada disponível.</span>}
                        </div>
                        {error && (
                            <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </p>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                                <GitCommit size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Hash</span>
                                <span className="font-mono text-slate-200 select-all">{commit.sha.substring(0, 7)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <div className="p-2 bg-slate-800 rounded-lg text-orange-500">
                                <Calendar size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Data</span>
                                <span className="text-slate-200">{new Date(commit.date).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <div className="p-2 bg-slate-800 rounded-lg text-emerald-500">
                                <FolderGit2 size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Repositório</span>
                                <span className="font-medium text-slate-200">{commit.repo}</span>
                            </div>
                        </div>

                        {commit.branch && (
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                <div className="p-2 bg-slate-800 rounded-lg text-purple-500">
                                    <GitBranch size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Branch</span>
                                    <span className="text-slate-200">{commit.branch}</span>
                                </div>
                            </div>
                        )}

                        {commit.scope && (
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                <div className="p-2 bg-slate-800 rounded-lg text-cyan-500">
                                    <Tag size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Escopo</span>
                                    <span className="font-semibold text-slate-200">{commit.scope}</span>
                                </div>
                            </div>
                        )}

                        {commit.context && (
                            <div className="flex items-center gap-3 text-sm text-slate-400 md:col-span-2">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-200">
                                    <FileText size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-500">Contexto / PR</span>
                                    <span className="font-medium text-white">{commit.context}</span>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* File Changes */}
                    {commit.changes && commit.changes.length > 0 && (
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileCode size={16} /> Arquivos Alterados ({commit.changes.length})
                            </h4>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                {commit.changes.map((change, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-900 transition-colors text-sm group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {change.status === 'added' ? <FilePlus size={16} className="text-emerald-500 shrink-0" /> :
                                                change.status === 'deleted' ? <FileMinus size={16} className="text-rose-500 shrink-0" /> :
                                                    <FileEdit size={16} className="text-blue-500 shrink-0" />}
                                            <span className="truncate font-mono text-slate-300 group-hover:text-white transition-colors" title={change.fileName}>{change.fileName}</span>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 ml-4">
                                            {(change.additions !== undefined || change.deletions !== undefined) && (
                                                <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 px-2 py-1 rounded">
                                                    {change.additions && <span className="text-emerald-500">+{change.additions}</span>}
                                                    {change.deletions && <span className="text-rose-500">-{change.deletions}</span>}
                                                </div>
                                            )}
                                            {change.url && (
                                                <a href={change.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-400 transition-colors">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-6 border-t border-slate-800">
                        <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 active:scale-95 text-sm font-bold"
                        >
                            <ExternalLink size={18} />
                            Ver no {provider === 'github' ? 'GitHub' : 'Azure DevOps'}
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CommitDetailModal;
