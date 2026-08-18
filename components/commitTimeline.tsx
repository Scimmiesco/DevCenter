import { CategorizedCommit, CategoryType } from "@/types";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  FolderGit2,
  GitBranch,
  PieChart,
  Search,
  Tag,
} from "lucide-react";
import { Cell, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { getCategoryEmoji, getCategoryLabel } from "../utils/analyzer";
import { useMemo, useState } from "react";
import CommitDetailModal from "./CommitDetailModal";

export const CommitTimeline = ({ stats, token, provider }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(
    null
  );
  const commitCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [CategoryType.FEATURE]: 0,
      [CategoryType.FIX]: 0,
      [CategoryType.REFACTOR]: 0,
      [CategoryType.MAINTENANCE]: 0,
    };
    stats.categorizedCommits.forEach(
      (c) => (counts[c.category] = (counts[c.category] || 0) + 1)
    );
    return counts;
  }, [stats.categorizedCommits]);
  const [selectedCommit, setSelectedCommit] =
    useState<CategorizedCommit | null>(null);

  // --- Grouping State ---
  const [groupBy, setGroupBy] = useState<"repo" | "author">("repo");
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10); // Initial visible groups

  // --- Filtering Logic for Timeline (Visual) ---
  const filteredCommits = useMemo(() => {
    let commits = [...stats.categorizedCommits];

    // Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      commits = commits.filter(
        (c) =>
          c.message.toLowerCase().includes(lower) ||
          c.sha.toLowerCase().includes(lower) ||
          (c.scope && c.scope.toLowerCase().includes(lower))
      );
    }

    // Filter by Category
    if (selectedCategory) {
      commits = commits.filter((c) => c.category === selectedCategory);
    }

    // Filter by Author
    if (selectedAuthor) {
      commits = commits.filter((c) => c.author === selectedAuthor);
    }

    // Sort by date desc
    return commits.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [stats.categorizedCommits, searchTerm, selectedCategory, selectedAuthor]);

  // Extract Unique Authors for Filter
  const uniqueAuthors = useMemo(() => {
    const authors: Record<string, number> = {};
    stats.categorizedCommits.forEach((c) => {
      if (c.author) {
        authors[c.author] = (authors[c.author] || 0) + 1;
      }
    });
    return authors;
  }, [stats.categorizedCommits]);

  // Group Logic (Dynamic based on groupBy state)
  const timelineGroups = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      commits: CategorizedCommit[];
      avatar?: string;
    }[] = [];
    const map: Record<string, CategorizedCommit[]> = {};

    filteredCommits.forEach((c) => {
      const key = groupBy === "repo" ? c.repo : c.author || "Unknown";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });

    Object.entries(map).forEach(([key, commits]) => {
      groups.push({
        key,
        label: key,
        commits,
        avatar: commits[0]?.authorAvatar, // Using first commit's avatar if available
      });
    });

    return groups.sort((a, b) => b.commits.length - a.commits.length);
  }, [filteredCommits, groupBy]);

  // Visible Groups (Pagination)
  const visibleGroups = useMemo(() => {
    return timelineGroups.slice(0, visibleCount);
  }, [timelineGroups, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  // --- Collapsible Logic ---
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Chart Data
  const chartData = [
    {
      name: "Features",
      value: commitCounts[CategoryType.FEATURE],
      color: "#10b981",
    }, // Emerald
    { name: "Fixes", value: commitCounts[CategoryType.FIX], color: "#f43f5e" }, // Rose
    {
      name: "Refactor",
      value: commitCounts[CategoryType.REFACTOR],
      color: "#3b82f6",
    }, // Blue
    {
      name: "Maint",
      value: commitCounts[CategoryType.MAINTENANCE],
      color: "#94a3b8",
    }, // Slate
  ].filter((x) => x.value > 0);

  return (
    /* --- Timeline View --- */
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <div className="container-destacado flex flex-col gap-2 justify-start rounded-md borde sticky! top-8 min-h-[50vh]">
          <div className="absolute top-0 right-0 w-64 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
          <h3 className="font-bold text-accent-light flex items-center gap-2">
            <span className="w-1 h-5 bg-accent rounded-full"></span>
            Filtros
          </h3>

          {/* Search Filter */}
          <div className="">
            <label className="text-xs font-bold uppercase text-accent-light/70 mb-2 block">
              Buscar
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-light/70"
                size={16}
              />
              <input
                type="text"
                placeholder="Mensagem, hash..."
                className="w-full  pl-8! p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Group By Control */}
          <div>
            <label className="text-xs font-bold uppercase text-accent-light/70 mb-2 block">
              Agrupar por
            </label>
            <div className="flex bg-surface rounded-md p-1 border border-gray800">
              <button
                onClick={() => setGroupBy("repo")}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${groupBy === "repo"
                  ? "bg-accent text-surface"
                  : "text-accent-light hover:text-white"
                  }`}
              >
                Repositório
              </button>
              <button
                onClick={() => setGroupBy("author")}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${groupBy === "author"
                  ? "bg-accent text-surface"
                  : "text-accent-light hover:text-white"
                  }`}
              >
                Autor
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-1">
            <label className="text-xs font-bold uppercase text-accent-light/70 mb-2 block">
              Categorias
            </label>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === null &&
                  "bg-accent text-surface font-bold"
                  }`}
              >
                Todas as categorias
              </button>
              {(Object.keys(commitCounts) as CategoryType[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${selectedCategory === cat
                    ? "text-white border-2 border-accent-light"
                    : "text-accent-light "
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`opacity-70 group-hover:opacity-100 transition-all group-hover:scale-115  ${selectedCategory === cat && "opacity-100 scale-115"
                        }`}
                    >
                      {getCategoryEmoji(cat)}
                    </span>
                    <span className="truncate">{getCategoryLabel(cat)}</span>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${selectedCategory === cat
                      ? "bg-accent text-surface font-bold"
                      : "text-accent-white"
                      }`}
                  >
                    {commitCounts[cat]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Author Filter */}
          {Object.keys(uniqueAuthors).length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-bold uppercase text-accent-light/70 mb-2 block">
                Autores
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                <button
                  onClick={() => setSelectedAuthor(null)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${selectedAuthor === null
                    ? "bg-accent/20 text-accent font-bold border border-accent/50"
                    : "text-accent-light hover:text-white"
                    }`}
                >
                  Todos os autores
                </button>
                {Object.entries(uniqueAuthors).map(([author, count]) => (
                  <button
                    key={author}
                    onClick={() => setSelectedAuthor(author)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex justify-between ${selectedAuthor === author
                      ? "bg-accent/20 text-accent font-bold border border-accent/50"
                      : "text-accent-light hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <span className="truncate flex-1">{author}</span>
                    <span className="text-[10px] bg-gray800 px-1 rounded opacity-70">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Distribution Chart (Mini) */}
        <div className="hidden rounded-xl border border-gray800 p-5 shadow-lg sticky top-[calc(50vh+3rem)]">
          <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
            Distribuição
          </h3>
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
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="rgba(0,0,0,0.2)"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                  }}
                  itemStyle={{ color: "#cbd5e1" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Commit Feed */}
      <div className="lg:col-span-3 space-y-8">
        {visibleGroups.map((group, groupIndex) => {
          const isCollapsed = collapsedGroups[group.key];
          // Calculate quick insight stats for this repo (e.g. 5 Feat | 2 Fix)
          const groupCounts: any = {};
          group.commits.forEach(
            (c) =>
              (groupCounts[c.category] = (groupCounts[c.category] || 0) + 1)
          );

          return (
            <div
              key={group.key}
              className=" rounded-2xl border border-gray800 shadow-xl overflow-hidden animate-fade-in"
              style={{ animationDelay: `${groupIndex * 100}ms` }}
            >
              {/* Header Collapsible */}
              <div
                onClick={() => toggleGroup(group.key)}
                className={`sticky top-0 bg-surface z-10 flex items-center justify-between p-3 cursor-pointer select-none transition-colors border-b border-gray800 hover:bg-gray900`}
              >
                <div className="p-2 text-accent">
                  {groupBy === "repo" ? (
                    <FolderGit2 size={24} />
                  ) : group.avatar ? (
                    <img
                      src={group.avatar}
                      alt={group.label}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="pl-8 border-l-2 border-accent/20 ml-2 space-y-3 pt-2 pb-2 justify-center text-xs font-bold">
                      {group.label.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-accent-light">
                    {group.label}
                  </h2>
                  <div className="flex gap-2 text-[10px] mt-0.5 ">
                    {groupCounts[CategoryType.FEATURE] > 0 && (
                      <span className="text-primary font-bold font-mono">
                        {groupCounts[CategoryType.FEATURE]} feat
                      </span>
                    )}
                    {groupCounts[CategoryType.FIX] > 0 && (
                      <span className="text-rose-400 font-bold font-mono">
                        {groupCounts[CategoryType.FIX]} fix
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono text-accent px-2 py-1  rounded ml-auto border">
                  {group.commits.length} commits
                </span>
              </div>

              {!isCollapsed && (
                <div className=" ">
                  {group.commits.map((commit) => (
                    <div
                      key={commit.sha}
                      onClick={() => setSelectedCommit(commit)}
                      className="p-2 hover:bg-surface transition-all cursor-pointer group "
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="text-2xl p-2 opacity-70 group-hover:opacity-100 group-hover:scale-115 transition-transform"
                          title={getCategoryLabel(commit.category)}
                        >
                          {getCategoryEmoji(commit.category)}
                        </div>
                        <div className="flex-1 min-w-0 gap-2 flex flex-col">
                          {/* TASK CONTEXT SECTION */}
                          {commit.taskInfo && (
                            <div className="rounded-md p-2 border border-gray800/50 flex flex-col gap-1 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-accent-light0/5 rounded-bl-full pointer-events-none"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                                  {commit.taskInfo.type} {commit.taskInfo.id}
                                </span>
                                <span className="bg-gray800 text-accent-light text-[10px] px-1.5 py-0.5 rounded border border-gray700">
                                  {commit.taskInfo.sprint}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-accent-light truncate">
                                {commit.taskInfo.title}
                              </h4>
                              <div className="text-[10px] text-accent-light/70 flex items-center gap-1">
                                <span className="opacity-70">Criado por:</span>{" "}
                                <span className="text-accent-light/70">
                                  {commit.taskInfo.createdBy}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-accent-light group-hover:text-accent transition-colors truncate">
                              {commit.message}
                            </h3>
                            {commit.body && (
                              <FileText
                                size={24}
                                className="text-accent-light/70 shrink-0"
                              />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 text-xs text-accent-light">
                            {commit.branch !== "Geral" ? (
                              <span className="flex items-center gap-2 font-mono  text-accent px-2 py-1 rounded-md border border-accent">
                                <GitBranch size={16} />
                                {commit.branch}
                              </span>
                            ) : (
                              <span
                                className="flex items-center gap-2 font-mono text-accent"
                                title="Commit direto na branch principal ou sem contexto de branch"
                              >
                                <GitBranch size={16} />
                                Direct Commit
                              </span>
                            )}

                            <span className="flex items-center gap-2 font-mono px-2 py-1 rounded border ">
                              #{commit.sha.substring(0, 7)}
                            </span>

                            <span className="flex items-center gap-2 font-mono border py-1 px-2 rounded-md">
                              <CalendarCheck
                                size={16}
                                className="text-accent"
                              />
                              {new Date(commit.date).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-accent-light/70 group-hover:text-accent-light0 transition-colors self-center">
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
        {visibleGroups.length < timelineGroups.length && (
          <div className="text-center pt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 bg-accent/10 border border-accent/20 text-accent font-bold rounded-full hover:bg-accent/20 transition-all"
            >
              Carregar mais ({timelineGroups.length - visibleGroups.length}{" "}
              restantes)
            </button>
          </div>
        )}
        {timelineGroups.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <div className="mb-4 bg-gray800 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-accent-light/70">
              <GitBranch size={40} />
            </div>
            <p className="text-xl font-bold text-accent-light/70">
              Nenhum commit encontrado
            </p>
            <p className="text-sm text-accent-light/70 mt-2">
              Tente ajustar seus filtros de busca.
            </p>
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
