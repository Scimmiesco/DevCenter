import {
  BrainCircuit,
  Coffee,
  Zap,
  Users,
  CalendarCheck,
  MessageSquareText,
  Check,
  Copy,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { ContextSelector } from "./ContextSelector";
import {
  CategorizedCommit,
  CategoryType,
  Provider,
  UserContext,
  YearStats,
  AIConfig,
} from "@/types";
import { buildPrompt } from "@/utils/ai-prompts";
import { generateSpeechWithAI } from "@/services/speech";
import {
  fetchAzureCommitDiff,
  fetchGitHubCommitDiff,
} from "@/services/taskGenerator";

interface SpeechAssistantProps {
  username: string;
  stats: YearStats;
  provider: Provider;
  token?: string; // Added token prop
  userContext: UserContext;
  setUserContext: (ctx: UserContext) => void;
  aiConfig: AIConfig;
}

type ViewMode = "daily" | "sprint" | "semester" | "year";

const VIEW_MODES = [
  {
    id: "daily" as const,
    label: "Daily Stand-up",
    icon: Coffee,
    description: "Foco: Ontem vs Hoje. O que foi feito e impedimentos.",
    activeClass: "!bg-accent/10",
    indicatorColor: "bg-accent",
    borderColor: "border-accent",
    iconColor: "text-accent",
  },
  {
    id: "sprint" as const,
    label: "Review da Sprint",
    icon: Zap,
    description: "Foco: Entregas de valor, funcionalidades e dematadas.",
    activeClass: "!bg-purple-500/10",
    indicatorColor: "bg-purple-500",
    borderColor: "border-purple-500",
    iconColor: "text-accent-light",

  },
  {
    id: "semester" as const,
    label: "Feedback 1:1",
    icon: Users,
    description: "Foco: Evolução semestral, projetos e colaboração.",
    activeClass: "!bg-green-500/10",
    indicatorColor: "bg-green-500",
    borderColor: "border-green-500",
    iconColor: "text-green-500",
  },
  {
    id: "year" as const,
    label: "Retrospectiva Anual",
    icon: CalendarCheck,
    description: "Foco: Visão holística do ano, constância e marcos.",
    activeClass: "!bg-blue-600/10",
    indicatorColor: "bg-accent-light",
    borderColor: "border-accent-light",
    iconColor: "text-accent-light",
  },
];
export const SpeechAssistant: React.FC<SpeechAssistantProps> = ({
  userContext,
  setUserContext,
  provider,
  token,
  stats,
  username,
  aiConfig,
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sprint"); // Controls AI Context
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const cancelAiGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // --- Actions ---

  const copyToClipboard = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const aiContextCommits = useMemo(() => {
    const today = new Date();
    const commits = [...stats.categorizedCommits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    switch (viewMode) {
      case "daily":
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 2);
        return commits.filter((c) => new Date(c.date) > yesterday);
      case "sprint":
        const sprintStart = new Date();
        sprintStart.setDate(today.getDate() - 15);
        return commits.filter((c) => new Date(c.date) > sprintStart);
      case "semester":
        const semesterStart = new Date();
        semesterStart.setMonth(today.getMonth() - 6);
        return commits.filter((c) => new Date(c.date) > semesterStart);
      case "year":
      default:
        return commits;
    }
  }, [viewMode, stats.categorizedCommits]);

  const generateAiSummary = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGeneratingAi(true);
    try {
      // Group commits for the prompt
      const promptGroups: Record<string, CategorizedCommit[]> = {};

      // Enrich commits with details
      const enrichedCommits: CategorizedCommit[] = [];

      // Helper to process commits in chunks to avoid rate limits
      const processCommit = async (c: CategorizedCommit) => {
        let details = c.body || "";
        try {
          // Use prop token
          if (c.url.includes("azure") && token) {
            const data = await fetchAzureCommitDiff(c.url, c.sha, token);
            details = `[Full Message]: ${data.description
              }\n[Diff Summary]:\n${data.diff.substring(0, 500)}`;

          } else if (c.url.includes("github")) {
            const data = await fetchGitHubCommitDiff(c.repo, c.sha, token);
            details = `[Full Message]: ${data.description
              }\n[Diff Summary]:\n${data.diff.substring(0, 500)}`;

          }
        } catch (err) {
          console.warn(`Failed to fetch details for ${c.sha}`, err);
        }

        return { ...c, body: details };
      };

      // Process all selected context commits
      for (const c of aiContextCommits) {
        if (controller.signal.aborted) throw new Error("AbortError");
        const enriched = await processCommit(c);
        enrichedCommits.push(enriched);

        // Grouping logic remains the same but uses enriched data
        if (!promptGroups[enriched.repo]) {
          promptGroups[enriched.repo] = [];
        }
        promptGroups[enriched.repo].push(enriched);
      }

      const prompt = buildPrompt(
        userContext,
        viewMode,
        username,
        enrichedCommits,
        stats.byCategory,
        promptGroups
      );

      console.log("🤖 [AI] Prompt Gerado:", prompt);

      if (controller.signal.aborted) throw new Error("AbortError");
      const response = await generateSpeechWithAI(prompt, aiConfig, controller.signal);

      console.log("🤖 [AI] Resposta IA:", response);
      setAiSummary(response.content);
    } catch (e: any) {
      if (e.message === 'AbortError' || e.name === 'AbortError') {
        setAiSummary("Processamento de IA cancelado pelo usuário.");
      } else {
        console.error(e);
        setAiSummary(`Erro ao gerar resumo: ${e.message}`);
      }
    } finally {
      setGeneratingAi(false);
      abortControllerRef.current = null;
    }
  };

  return (
    /* --- Assistant View --- */
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel: Context & Settings */}
      <div className="lg:col-span-1 space-y-6">
        {/* Integrated Context Selector */}
        <ContextSelector context={userContext} onChange={setUserContext} />

        {/* AI Controls */}
        <div className="container-destacado">
          <div className="absolute -top-20 right-0 w-64 h-48 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
          <h3 className="flex items-center gap-2 font-bold text-accent-light p-2">
            <BrainCircuit className="text-accent" size="24" /> Gerar Discurso
          </h3>

          <div className="space-y-2">
            {VIEW_MODES.map((mode) => {
              const isActive = viewMode === mode.id;
              return (
                <label
                  key={mode.id}
                  className={`block p-3 rounded-lg border cursor-pointer transition-all group ${isActive
                    ? `${mode.activeClass} ${mode.borderColor}`
                    : "bg-gray950/50 border-gray800 hover:border-gray600"
                    }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="aiMode"
                      className="hidden"
                      checked={isActive}
                      onChange={() => setViewMode(mode.id)}
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive
                        ? mode.borderColor
                        : "border-gray600 group-hover:border-gray400"
                        }`}
                    >
                      {isActive && (
                        <div
                          className={`w-2 h-2 rounded-full ${mode.indicatorColor}`}
                        ></div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${isActive ? "text-white" : "text-gray-400"}`}>
                      <mode.icon size={16} className={mode.iconColor} />
                      {mode.label}
                    </div>
                  </div>
                  <p className={`text-xs ml-7 ${isActive ? "text-accent-light" : "text-gray-500"}`}>
                    {mode.description}
                  </p>
                </label>
              );
            })}

            {userContext.isHRMode && (
              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-start gap-2">
                <Users size={14} className="mt-0.5 shrink-0" />
                Modo RH Ativo: O relatório será gerado na terceira pessoa,
                focado em avaliação de performance.
              </div>
            )}

            <button
              onClick={generateAiSummary}
              disabled={generatingAi}
              className={`botao-primario w-full justify-center ${generatingAi
                ? "bg-surface-muted cursor-not-allowed text-accent-light"
                : "cursor-pointer"
                }`}
            >
              {generatingAi ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Criando Roteiro...</span>
                </>
              ) : (
                <>
                  <MessageSquareText size={20} />
                  Gerar Roteiro{" "}
                  {userContext.isHRMode ? "de Avaliação" : "de Fala"}
                </>
              )}
            </button>
            {generatingAi && (
              <button
                onClick={cancelAiGeneration}
                className="w-full justify-center flex items-center gap-2 p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors border border-red-500/30"
              >
                Cancelar Processamento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: AI Output */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gray900 rounded-xl border border-gray800 p-8 shadow-lg min-h-[500px] relative animate-fade-in">
          {aiSummary ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">✨</span> Roteiro Sugerido
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray800 text-accent-light/70 hover:bg-gray700 hover:text-white"
                      }`}

                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div className="prose prose-invert max-w-none prose-p:text-accent-light prose-headings:text-white prose-strong:text-accent prose-ul:text-accent-light">
                {/* Split summary by lines and render delicately */}
                {aiSummary.split("\n").map((line, i) => (
                  <p
                    key={i}

                    className={`mb-2 leading-relaxed ${line.startsWith("#")
                      ? "text-lg font-bold text-white mt-4"
                      : line.startsWith("-")
                        ? "ml-4"
                        : ""
                      }`}

                  >
                    {line.replaceAll("#", "").trim()}
                  </p>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800">
                <p className="text-xs text-accent-light/70 italic text-center">
                  Gerado por IA ({aiConfig.provider === 'gemini' ? 'Gemini 2.5' : 'DeepSeek Reasoner'}) • Revisão recomendada antes
                  de falar.
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-accent-light/70 p-8 text-center opacity-60">
              <div className="w-24 h-24 bg-gray800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <BrainCircuit size={48} className="text-accent-light/70" />
              </div>
              <h3 className="text-xl font-bold text-accent-light/70 mb-2">
                Aguardando geração
              </h3>
              <p className="max-w-md">
                Configure o seu contexto ao lado e clique em "Gerar Roteiro"
                para criar um discurso personalizado para sua Daily ou Review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};
