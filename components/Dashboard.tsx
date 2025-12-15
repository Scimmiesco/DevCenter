import React, { useState, useMemo } from 'react';
import { YearStats, CategoryType, CategorizedCommit, Provider, UserContext } from '../types';
import { getCategoryEmoji, getCategoryLabel } from '../utils/analyzer';
import { buildPrompt } from '../utils/ai-prompts';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Copy, Check, TicketPlus, ArrowLeft, BrainCircuit, Coffee, Zap, Users, CalendarCheck, GitBranch, FolderGit2, Tag, ExternalLink, FileText, LayoutList, MessageSquareText, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import CommitDetailModal from './CommitDetailModal';
import ContextSelector from './ContextSelector';
import TaskGenerator from './taskGenerator';
import { CommitTimeline } from './commitTimeline';
import { SpeechAssistant } from './speechAssistant';

interface DashboardProps {
  username: string;
  year: number;
  stats: YearStats;
  onReset: () => void;
  provider: Provider;
  token?: string;
  userContext: UserContext;
  setUserContext: (ctx: UserContext) => void;
}


const Dashboard: React.FC<DashboardProps> = ({ username, year, stats, onReset, provider, token, userContext, setUserContext }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'assistant' | 'taskGenerate'>('taskGenerate');

  const [selectedCommit, setSelectedCommit] = useState<CategorizedCommit | null>(null);


  // --- Filtering Logic for AI Context (Hidden logic) ---


  // Global Stats
  const totalCommits = stats.categorizedCommits.length;
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

  const mostFrequentCategory = Object.entries(commitCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as CategoryType;


  // Helper for identity display
  const displayIdentity = username || "Desenvolvedor";
  // Group Count for KPI
  const activeReposCount = 2;


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 animate-in fade-in duration-500 rounded-md">

      {/* Header & Global Metrics */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Olá, <span className="text-blue-500">{displayIdentity.split(/[, ]/)[0]}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              Análise de impacto em <span className="text-orange-500 font-mono">{Object.keys(commitCounts).length > 0 ? activeReposCount : 0}</span> repositórios.
            </p>
          </div>
          <button
            onClick={onReset}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Commits */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <GitBranch size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total de Commits</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalCommits}</div>
            <div className="text-xs text-slate-500 mt-1">no período selecionado</div>
          </div>

          {/* Top Type */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Zap size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Foco Principal</span>
            </div>
            <div className="text-2xl font-bold text-white truncate" title={getCategoryLabel(mostFrequentCategory)}>
              {getCategoryLabel(mostFrequentCategory)}
            </div>
            <div className="text-xs text-slate-500 mt-1">maioria das entregas</div>
          </div>

          {/* Repos Active */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <FolderGit2 size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Repositórios</span>
            </div>
            <div className="text-3xl font-bold text-white">{activeReposCount}</div>
            <div className="text-xs text-slate-500 mt-1">projetos ativos</div>
          </div>

          {/* Year/Time */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <CalendarCheck size={20} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Período</span>
            </div>
            <div className="text-3xl font-bold text-white">{year}</div>
            <div className="text-xs text-slate-500 mt-1">ano de referência</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('taskGenerate')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'taskGenerate' ? 'border-emerald-500 text-emerald-400 bg-slate-900/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30 rounded-t-lg'}`}
          >
            <TicketPlus size={18} /> Gerador de Tarefas
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400 bg-slate-900/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30 rounded-t-lg'}`}
          >
            <LayoutList size={18} /> Timeline de Commits
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'assistant' ? 'border-orange-500 text-orange-400 bg-slate-900/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30 rounded-t-lg'}`}
          >
            <BrainCircuit size={18} /> Assistente de Discurso
          </button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'timeline' ? (
            <CommitTimeline stats={stats} provider={provider}
              token={token} />
          ) : activeTab === 'assistant' ? (
            <SpeechAssistant
              stats={stats}
              username={username}
              provider={provider}
              userContext={userContext}
              setUserContext={setUserContext}
            />
          ) : (
            <TaskGenerator
              provider={provider}
              token={token}
              userContext={userContext}
              username={username}
            />
          )}
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
