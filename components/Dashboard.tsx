import React, { useState, useMemo } from "react";
import {
  YearStats,
  CategoryType,
  CategorizedCommit,
  Provider,
  UserContext,
  AIConfig,
} from "../types";
import { getCategoryEmoji, getCategoryLabel } from "../utils/analyzer";
import { buildPrompt } from "../utils/ai-prompts";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Copy,
  Check,
  TicketPlus,
  ArrowLeft,
  BrainCircuit,
  Coffee,
  Zap,
  Users,
  CalendarCheck,
  GitBranch,
  FolderGit2,
  Tag,
  ExternalLink,
  FileText,
  LayoutList,
  MessageSquareText,
  Search,
  Settings,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import CommitDetailModal from "./CommitDetailModal";

import TaskGenerator from "./taskGenerator";
import { CommitTimeline } from "./commitTimeline";
import { SpeechAssistant } from "./speechAssistant";
import { AiConfigTab } from "./AiConfigTab";

import { AzureRepository } from "../types";

interface DashboardProps {
  username: string;
  dateRange: { label: string; start: Date; end: Date };
  stats: YearStats;
  onReset: () => void;
  provider: Provider;
  token?: string;
  userContext: UserContext;
  setUserContext: (ctx: UserContext) => void;
  // Data Props
  azureConfig?: { org: string; token: string; aliases: string[] } | null;
  selectedRepos?: AzureRepository[];
  aiConfig: AIConfig;
  setAiConfig: (config: AIConfig) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  username,
  dateRange,
  stats,
  onReset,
  provider,
  token,
  userContext,
  setUserContext,
  azureConfig,
  selectedRepos,
  aiConfig,
  setAiConfig,
}) => {
  const [activeTab, setActiveTab] = useState<
    "timeline" | "assistant" | "taskGenerate" | "aiConfig"
  >("taskGenerate");

  // Global Stats
  const totalCommits = stats.categorizedCommits.length;
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

  const mostFrequentCategory = Object.entries(commitCounts).sort(
    (a, b) => (b[1] as number) - (a[1] as number)
  )[0][0] as CategoryType;

  // Helper for identity display
  const displayIdentity = username || "Desenvolvedor";
  // Group Count for KPI
  const activeRepos = selectedRepos?.map((repo) => repo.name) ?? [];

  return (
    <div className="min-h-screen text-accent-light bg-surface-muted border-2 border-primary-dark p-4 animate-in fade-in duration-500 rounded-md">
      {/* Header & Global Metrics */}
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-accent-light to-accent">
              Olá,{" "}
              <span className="text-accent">
                {displayIdentity.split(/[, ]/)[0]}
              </span>
            </h1>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total de Commits",
              value: totalCommits,
              footer: "no período selecionado",
              icon: GitBranch,
            },
            {
              label: "Foco Principal",
              value: getCategoryLabel(mostFrequentCategory),
              footer: "maioria das entregas",
              icon: Zap,
            },
            {
              label: "Repositórios",
              value: activeRepos.length,
              footer: "projetos ativos",
              icon: FolderGit2,
            },
            {
              label: "Período",
              value: dateRange.label,
              footer: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
              icon: CalendarCheck,
            },
          ].map((item, index) => (
            <div
              key={index}
              className="flex flex-col justify-around bg-surface-muted p-2 rounded-xl border-2 border-accent-light relative overflow-hidden group hover:border-white transition-colors"
            >
              <div className="absolute top-0 right-0 w-64 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
              <div className="flex justify-start items-center text-center gap-1">
                <div className="p-2 text-accent group-hover:text-white group-hover:bg-orange-600/20 rounded-md transition-colors">
                  <item.icon size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent-light">
                  {item.label}
                </span>
              </div>
              <div
                className="text-3xl font-bold text-accent-light truncate px-2"
                title={item.value.toString()}
              >
                {item.value}
              </div>
              <div className="text-xs text-accent-light/70 px-2">
                {item.footer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* Tabs Navigation */}
        <div className="flex justify-center gap-2 p-2">
          {[
            {
              id: "taskGenerate",
              label: "Gerador de Tarefas",
              icon: TicketPlus,
            },
            { id: "timeline", label: "Timeline de Commits", icon: LayoutList },
            {
              id: "assistant",
              label: "Assistente de Discurso",
              icon: BrainCircuit,
            },
            {
              id: "aiConfig",
              label: "Configurações de IA",
              icon: Settings,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-1 text-center justify-center items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all 
                ${activeTab === tab.id
                  ? `border-orange-600 text-accent-light0 `
                  : "border-transparent text-accent-light/70 hover:text-accent-light"
                }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === "timeline" ? (
            <CommitTimeline stats={stats} provider={provider} token={token} />
          ) : activeTab === "aiConfig" ? (
            <AiConfigTab aiConfig={aiConfig} setAiConfig={setAiConfig} />
          ) : activeTab === "assistant" ? (
            <SpeechAssistant
              stats={stats}
              username={username}
              provider={provider}
              token={token}
              userContext={userContext}
              setUserContext={setUserContext}
              aiConfig={aiConfig}
            />
          ) : (
            <TaskGenerator
              provider={provider}
              token={token}
              userContext={userContext}
              username={username}
              // Data Props
              azureConfig={azureConfig}
              selectedRepos={selectedRepos}
              aiConfig={aiConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
