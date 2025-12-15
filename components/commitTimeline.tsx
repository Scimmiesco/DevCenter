import { CategorizedCommit, CategoryType } from "@/types";
import { ArrowLeft, CalendarCheck, FileText, FolderGit2, GitBranch, PieChart, Search, Tag } from "lucide-react";
import { Cell, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { getCategoryEmoji, getCategoryLabel } from '../utils/analyzer';
import { useMemo, useState } from "react";
import CommitDetailModal from "./CommitDetailModal";

export const CommitTimeline = ({ stats, token, provider }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
    const commitCounts = useMemo(() => {
        const counts: Record<string, number> = {
            [CategoryType.FEATURE]: 0,
            [CategoryType.FIX]: 0,
            [CategoryType.REFACTOR]: 0,
            [CategoryType.MAINTENANCE]: 0
        };
        stats.categorizedCommits.forEach(c => counts[c.category] = (counts[c.category] || 0) + 1);
        return counts;
    }, [stats.categorizedCommits]);
    const [selectedCommit, setSelectedCommit] = useState<CategorizedCommit | null>(null);

    // --- Filtering Logic for Timeline (Visual) ---
    const filteredCommits = useMemo(() => {
        let commits = [...stats.categorizedCommits];

        // Filter by Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            commits = commits.filter(c =>
                c.message.toLowerCase().includes(lower) ||
                c.sha.toLowerCase().includes(lower) ||
                (c.scope && c.scope.toLowerCase().includes(lower))
            );
        }

        // Filter by Category
        if (selectedCategory) {
            commits = commits.filter(c => c.category === selectedCategory);
        }

        // Sort by date desc
        return commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [stats.categorizedCommits, searchTerm, selectedCategory]);

    // Group by Repo for Timeline
    const timelineGroups = useMemo(() => {
        // Only group visually if searched/filtered
        // Actually standard grouping by Repo -> Date/Month might be better?
        // Let's stick to Repo grouping as primary
        const groups: { repo: string; commits: CategorizedCommit[] }[] = [];

        // Group map
        const map: Record<string, CategorizedCommit[]> = {};
        filteredCommits.forEach(c => {
            if (!map[c.repo]) map[c.repo] = [];
            map[c.repo].push(c);
        });

        Object.entries(map).forEach(([repo, commits]) => {
            groups.push({ repo, commits });
        });

        return groups.sort((a, b) => b.commits.length - a.commits.length);
    }, [filteredCommits]);


    // --- Collapsible Logic ---
    const [collapsedRepos, setCollapsedRepos] = useState<Record<string, boolean>>({});

    const toggleRepo = (repo: string) => {
        setCollapsedRepos(prev => ({ ...prev, [repo]: !prev[repo] }));
    };

    // Chart Data
    const chartData = [
        { name: 'Features', value: commitCounts[CategoryType.FEATURE], color: '#10b981' }, // Emerald
        { name: 'Fixes', value: commitCounts[CategoryType.FIX], color: '#f43f5e' }, // Rose
        { name: 'Refactor', value: commitCounts[CategoryType.REFACTOR], color: '#3b82f6' }, // Blue
        { name: 'Maint', value: commitCounts[CategoryType.MAINTENANCE], color: '#94a3b8' } // Slate
    ].filter(x => x.value > 0);


    return (
        /* --- Timeline View --- */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Filters Sidebar */}
            <div className="lg:col-span-1 space-y-6">
                <div className="flex flex-col justify-start bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg sticky top-8 h-[50vh]">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                        Filtros
                    </h3>

                    {/* Search Filter */}
                    <div className="mb-4">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Mensagem, hash..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder-slate-600"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex-1">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Categorias</label>
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                Todas as categorias
                            </button>
                            {(Object.keys(commitCounts) as CategoryType[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${selectedCategory === cat ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="opacity-70 group-hover:opacity-100 transition-opacity">{getCategoryEmoji(cat)}</span>
                                        <span className="truncate">{getCategoryLabel(cat)}</span>
                                    </div>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${selectedCategory === cat ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-600'}`}>
                                        {commitCounts[cat]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Distribution Chart (Mini) */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg sticky top-[calc(50vh+3rem)]">
                    <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Distribuição</h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.2)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Commit Feed */}
            <div className="lg:col-span-3 space-y-8">
                {timelineGroups.map((group, groupIndex) => {
                    const isCollapsed = collapsedRepos[group.repo];
                    // Calculate quick insight stats for this repo (e.g. 5 Feat | 2 Fix)
                    const repoCounts: any = {};
                    group.commits.forEach(c => repoCounts[c.category] = (repoCounts[c.category] || 0) + 1);

                    return (
                        <div key={group.repo} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                            {/* Header Collapsible */}
                            <div
                                onClick={() => toggleRepo(group.repo)}
                                className="bg-slate-950/50 px-6 py-4 border-b border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                            >
                                <div className="p-2 bg-slate-800 rounded-lg text-white transition-transform duration-300">
                                    <FolderGit2 size={20} className={isCollapsed ? "-rotate-90" : "rotate-0"} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{group.repo}</h2>
                                    <div className="flex gap-2 text-[10px] mt-0.5 opacity-70">
                                        {repoCounts[CategoryType.FEATURE] > 0 && <span className="text-emerald-400">{repoCounts[CategoryType.FEATURE]} feat</span>}
                                        {repoCounts[CategoryType.FIX] > 0 && <span className="text-rose-400">{repoCounts[CategoryType.FIX]} fix</span>}
                                    </div>
                                </div>
                                <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded ml-auto border border-slate-700">
                                    {group.commits.length} commits
                                </span>
                            </div>

                            {!isCollapsed && (
                                <div className="divide-y divide-slate-800 bg-slate-900">
                                    {group.commits.map((commit) => (
                                        <div
                                            key={commit.sha}
                                            onClick={() => setSelectedCommit(commit)}
                                            className="p-4 hover:bg-slate-800/50 transition-all cursor-pointer group border-l-4 border-transparent hover:border-blue-500"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="text-2xl pt-1 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform" title={getCategoryLabel(commit.category)}>
                                                    {getCategoryEmoji(commit.category)}
                                                </div>
                                                <div className="flex-1 min-w-0">

                                                    {/* TASK CONTEXT SECTION */}
                                                    {commit.taskInfo && (
                                                        <div className="mb-3 bg-slate-950/80 rounded-lg p-3 border border-slate-800/50 flex flex-col gap-1 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                                                    {commit.taskInfo.type} {commit.taskInfo.id}
                                                                </span>
                                                                <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700">
                                                                    {commit.taskInfo.sprint}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-slate-200 truncate">{commit.taskInfo.title}</h4>
                                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                <span className="opacity-70">Criado por:</span> <span className="text-slate-400">{commit.taskInfo.createdBy}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-base font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                                                            {commit.message}
                                                        </h3>
                                                        {(commit.body) && (
                                                            <FileText size={14} className="text-slate-500 shrink-0" />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-2">
                                                        {commit.branch !== 'Geral' ? (
                                                            <span className="flex items-center gap-1 font-mono bg-blue-900/20 text-blue-300 px-2 py-0.5 rounded border border-blue-800/30">
                                                                <GitBranch size={12} />
                                                                {commit.branch}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 font-mono opacity-50" title="Commit direto na branch principal ou sem contexto de branch">
                                                                <GitBranch size={12} />
                                                                Direct Commit
                                                            </span>
                                                        )}

                                                        <span className="flex items-center gap-1 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 opacity-60">
                                                            #{commit.sha.substring(0, 7)}
                                                        </span>

                                                        <span className="flex items-center gap-1">
                                                            <CalendarCheck size={12} className="text-orange-500" />
                                                            {new Date(commit.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {commit.scope && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/50">
                                                                <Tag size={10} /> {commit.scope}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-slate-600 group-hover:text-blue-500 transition-colors self-center">
                                                    <ArrowLeft size={16} className="rotate-180" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {timelineGroups.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <div className="mb-4 bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-600">
                            <GitBranch size={40} />
                        </div>
                        <p className="text-xl font-bold text-slate-400">Nenhum commit encontrado</p>
                        <p className="text-sm text-slate-600 mt-2">Tente ajustar seus filtros de busca.</p>
                    </div>
                )}
            </div>


            {selectedCommit && (
                <CommitDetailModal
                    commit={selectedCommit}
                    onClose={() => setSelectedCommit(null)}
                    provider={provider}
                    token={token}
                />
            )}
        </div>
    );
};