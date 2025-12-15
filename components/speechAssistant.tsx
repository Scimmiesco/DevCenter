import { BrainCircuit, Coffee, Zap, Users, CalendarCheck, MessageSquareText, Check, Copy } from "lucide-react";
import React, { useMemo, useState } from "react";
import ContextSelector from "./ContextSelector";
import { CategorizedCommit, CategoryType, Provider, UserContext, YearStats } from "@/types";
import { buildPrompt } from "@/utils/ai-prompts";
import { GoogleGenAI } from "@google/genai";

interface SpeechAssistantProps {
    username: string;
    stats: YearStats;
    provider: Provider;
    userContext: UserContext;
    setUserContext: (ctx: UserContext) => void;
}

type ViewMode = 'daily' | 'sprint' | 'semester' | 'year';
export const SpeechAssistant: React.FC<SpeechAssistantProps> = ({ userContext, setUserContext, provider, stats, username }) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('sprint'); // Controls AI Context

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
        const commits = [...stats.categorizedCommits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        switch (viewMode) {
            case 'daily':
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 2);
                return commits.filter(c => new Date(c.date) > yesterday);
            case 'sprint':
                const sprintStart = new Date();
                sprintStart.setDate(today.getDate() - 15);
                return commits.filter(c => new Date(c.date) > sprintStart);
            case 'semester':
                const semesterStart = new Date();
                semesterStart.setMonth(today.getMonth() - 6);
                return commits.filter(c => new Date(c.date) > semesterStart);
            case 'year':
            default:
                return commits;
        }
    }, [viewMode, stats.categorizedCommits]);

    const generateAiSummary = async () => {
        if (!process.env.API_KEY) {
            alert("API Key não encontrada.");
            return;
        }

        setGeneratingAi(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // Group commits for the prompt
            const promptGroups: Record<string, CategorizedCommit[]> = {};
            aiContextCommits.forEach(c => {
                if (!promptGroups[c.repo]) promptGroups[c.repo] = [];
                promptGroups[c.repo].push(c);
            });

            const currentStats = {
                [CategoryType.FEATURE]: aiContextCommits.filter(c => c.category === CategoryType.FEATURE).length,
                [CategoryType.FIX]: aiContextCommits.filter(c => c.category === CategoryType.FIX).length,
                [CategoryType.REFACTOR]: aiContextCommits.filter(c => c.category === CategoryType.REFACTOR).length,
                [CategoryType.MAINTENANCE]: aiContextCommits.filter(c => c.category === CategoryType.MAINTENANCE).length,
            };

            const prompt = buildPrompt(
                userContext,
                viewMode,
                username,
                aiContextCommits,
                currentStats,
                promptGroups
            );

            console.log('🤖 [AI] Prompt Gerado:', prompt);

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp', // Or 'gemini-1.5-flash'
                contents: prompt,
            });

            console.log('🤖 [AI] Resposta Bruta:', response);
            // Fix: response.text is a getter in some versions or mapped that way in our environment
            const text = typeof response.text === 'function' ? response.text : response.text;
            setAiSummary(text);
        } catch (e) {
            console.error(e);
            setAiSummary("Erro ao gerar resumo. Verifique a console para detalhes.");
        } finally {
            setGeneratingAi(false);
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
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg animate-fade-in">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3">
                        <BrainCircuit className="text-blue-500" /> Gerar Discurso
                    </h3>

                    <div className="space-y-4">
                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all group ${viewMode === 'daily' ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="radio"
                                    name="aiMode"
                                    className="hidden"
                                    checked={viewMode === 'daily'}
                                    onChange={() => setViewMode('daily')}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${viewMode === 'daily' ? 'border-blue-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                    {viewMode === 'daily' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-slate-200">
                                    <Coffee size={16} className="text-orange-500" /> Daily Stand-up
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 ml-7">
                                Foco: Ontem vs Hoje. O que foi feito e impedimentos.
                            </p>
                        </label>

                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all group ${viewMode === 'sprint' ? 'bg-purple-600/10 border-purple-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="radio"
                                    name="aiMode"
                                    className="hidden"
                                    checked={viewMode === 'sprint'}
                                    onChange={() => setViewMode('sprint')}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${viewMode === 'sprint' ? 'border-purple-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                    {viewMode === 'sprint' && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-slate-200">
                                    <Zap size={16} className="text-yellow-500" /> Review da Sprint
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 ml-7">
                                Foco: Entregas de valor, funcionalidades e dematadas.
                            </p>
                        </label>

                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all group ${viewMode === 'semester' ? 'bg-green-600/10 border-green-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="radio"
                                    name="aiMode"
                                    className="hidden"
                                    checked={viewMode === 'semester'}
                                    onChange={() => setViewMode('semester')}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${viewMode === 'semester' ? 'border-green-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                    {viewMode === 'semester' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-slate-200">
                                    <Users size={16} className="text-green-500" /> Feedback 1:1
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 ml-7">
                                Foco: Evolução semestral, projetos e colaboração.
                            </p>
                        </label>

                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all group ${viewMode === 'year' ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="radio"
                                    name="aiMode"
                                    className="hidden"
                                    checked={viewMode === 'year'}
                                    onChange={() => setViewMode('year')}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${viewMode === 'year' ? 'border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                    {viewMode === 'year' && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-slate-200">
                                    <CalendarCheck size={16} className="text-indigo-500" /> Retrospectiva Anual
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 ml-7">
                                Foco: Visão holística do ano, constância e marcos.
                            </p>
                        </label>

                        {userContext.isHRMode && (
                            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300 flex items-start gap-2">
                                <Users size={14} className="mt-0.5 shrink-0" />
                                Modo RH Ativo: O relatório será gerado na terceira pessoa, focado em avaliação de performance.
                            </div>
                        )}

                        <button
                            onClick={generateAiSummary}
                            disabled={generatingAi}
                            className={`w-full py-4 mt-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 text-white ${generatingAi ? 'bg-slate-800 cursor-not-allowed text-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30'}`}
                        >
                            {generatingAi ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Criando Roteiro...</span>
                                </>
                            ) : (
                                <>
                                    <MessageSquareText size={20} />
                                    Gerar Roteiro {userContext.isHRMode ? 'de Avaliação' : 'de Fala'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: AI Output */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 shadow-lg min-h-[500px] relative animate-fade-in">
                    {aiSummary ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">✨</span> Roteiro Sugerido
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-blue-400 prose-ul:text-slate-300">
                                {/* Split summary by lines and render delicately */}
                                {aiSummary.split('\n').map((line, i) => (
                                    <p key={i} className={`mb-2 leading-relaxed ${line.startsWith('#') ? 'text-lg font-bold text-white mt-4' : line.startsWith('-') ? 'ml-4' : ''}`}>
                                        {line.replaceAll('#', '').trim()}
                                    </p>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800">
                                <p className="text-xs text-slate-500 italic text-center">
                                    Gerado por IA (Gemini 2.0 Flash) • Revisão recomendada antes de falar.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center opacity-60">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <BrainCircuit size={48} className="text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Aguardando geração</h3>
                            <p className="max-w-md">
                                Configure o seu contexto ao lado e clique em "Gerar Roteiro" para criar um discurso personalizado para sua Daily ou Review.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}