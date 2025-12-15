import React, { useState, useEffect } from 'react';
import { Provider, UserContext } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Download, Play, Plus, Loader2, Save, Trash2, Search, RotateCcw, Wand2, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskGeneratorProps {
    provider: Provider;
    token?: string;
    username: string;
    userContext: UserContext;
}

// --- INTEFACES ---
interface Task {
    taskId: string;
    customTitle: string;
    coherentDescription: string;
    complexity: 'baixa' | 'media' | 'alta' | 'unica';
    ustPoints: number;
    estimateMade: number;
    source: string;
    kbIndex: number;
}

interface RepoMeta {
    org?: string;
    proj?: string;
    repo?: string;
}

// --- KNOWLEDGE BASE ---
// Mapeamento estático baseado no user request
const KNOWLEDGE_BASE = [
    { id: "10", name: "Análise de Sistema Legado", complexities: { baixa: 3, media: 9, alta: 15 } },
    { id: "65", name: "Supervisão técnica (Codigo/Analise/Auxilio)", complexities: { unica: 10 } },
    { id: "17", name: "Implementação de novo Recurso (backend ou frontend)", complexities: { baixa: 8, media: 24, alta: 40 } },
    { id: "25", name: "Execução de Testes Funcionais (Manuais)", complexities: { unica: 5 } },
    { id: "38", name: "Elaboração de script", complexities: { unica: 5 } },
    { id: "14", name: "Implementação de Funcionalidade Relatório", complexities: { baixa: 11, media: 33, alta: 55 } },
    { id: "36", name: "Executar Merge em caso de conflitos", complexities: { unica: 1 } },
    { id: "34", name: "Implantação (Deployment) de aplicação", complexities: { unica: 1 } },
];

const TaskGenerator: React.FC<TaskGeneratorProps> = ({ provider, token, username, userContext }) => {
    // --- STATE ---
    const [config, setConfig] = useState({
        assignedTo: username || '',
        iterationPath: '',
        areaPath: '',
        ghRepo: '',
        ghCommit: '',
        azUrl: '',
        azCommit: '',
        azToken: token || ''
    });

    const [descInput, setDescInput] = useState('');
    const [diffInput, setDiffInput] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ msg: string; type: 'success' | 'error' | 'neutral' } | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [viewConfig, setViewConfig] = useState(true);

    // Load Config on Mount
    useEffect(() => {
        const load = (key: string) => localStorage.getItem('tg_' + key) || '';
        setConfig(prev => ({
            ...prev,
            assignedTo: load('assignedTo') || prev.assignedTo,
            iterationPath: load('iterationPath'),
            areaPath: load('areaPath'),
            ghRepo: load('ghRepo'),
            azUrl: load('azUrl'),
            // Token de API geralmente não salvamos ou salvamos com cuidado. 
            // O user snippet salvava, então manteremos a consistencia se desejado,
            // mas aqui optei por usar o props 'token' como default se disponivel.
        }));
    }, []);

    const saveConfig = () => {
        Object.entries(config).forEach(([k, v]) => {
            if (v && k !== 'azToken' && k !== 'ghCommit' && k !== 'azCommit') { // Avoid saving specifics
                localStorage.setItem('tg_' + k, v);
            }
        });
    };

    // --- REPO API ---
    const parseAzureUrl = (url: string): RepoMeta | null => {
        url = url.trim();
        const sshMatch = url.match(/git@ssh\.dev\.azure\.com:v3\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
        if (sshMatch) return { org: sshMatch[1], proj: sshMatch[2], repo: sshMatch[3] };

        const httpsMatch = url.match(/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/([^?#\/]+)/);
        if (httpsMatch) return { org: httpsMatch[1], proj: httpsMatch[2], repo: httpsMatch[3] };

        const vsMatch = url.match(/([^\.]+)\.visualstudio\.com\/([^\/]+)\/_git\/([^?#\/]+)/);
        if (vsMatch) return { org: vsMatch[1], proj: vsMatch[2], repo: vsMatch[3] };

        return null;
    };

    const fetchGitHub = async () => {
        if (!config.ghRepo || !config.ghCommit) return setStatusMsg({ msg: "Preencha Repo e Commit", type: 'error' });
        setLoading(true); setStatusMsg({ msg: "Buscando GitHub...", type: 'neutral' });
        try {
            const headers: any = {};
            // Use provided token logic if needed, currently assumes public or implicit
            const res = await fetch(`https://api.github.com/repos/${config.ghRepo}/commits/${config.ghCommit}`, { headers });
            if (!res.ok) throw new Error("Erro GitHub API");
            const data = await res.json();

            let diff = `[GitHub Commit] ${data.commit.message}\nFiles:\n`;
            if (data.files) data.files.forEach((f: any) => diff += `- ${f.filename} (${f.status})\n`);
            setDiffInput(diff);
            setDescInput(data.commit.message);
            setStatusMsg({ msg: "Diff carregado via GitHub", type: 'success' });
            saveConfig();
        } catch (e: any) {
            setStatusMsg({ msg: e.message, type: 'error' });
        } finally { setLoading(false); }
    };

    const fetchAzure = async () => {
        if (!config.azUrl || !config.azCommit || !config.azToken) return setStatusMsg({ msg: "Preencha URL, Commit e Token", type: 'error' });
        const meta = parseAzureUrl(config.azUrl);
        if (!meta) return setStatusMsg({ msg: "URL Azure inválida", type: 'error' });

        setLoading(true); setStatusMsg({ msg: "Buscando Azure...", type: 'neutral' });
        try {
            const auth = btoa(":" + config.azToken);
            const url = `https://dev.azure.com/${meta.org}/${meta.proj}/_apis/git/repositories/${meta.repo}/commits/${config.azCommit}/changes?api-version=7.0`;
            const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });

            if (!res.ok) throw new Error(`Erro ${res.status}: Verifique token/permissões`);

            const data = await res.json();
            let diff = `[Azure Commit] ${config.azCommit}\nFiles:\n`;
            if (data.changes) data.changes.forEach((c: any) => diff += `- [${c.changeType}] ${c.item.path}\n`);

            // Try fetching message
            try {
                const msgUrl = `https://dev.azure.com/${meta.org}/${meta.proj}/_apis/git/repositories/${meta.repo}/commits/${config.azCommit}?api-version=7.0`;
                const msgRes = await fetch(msgUrl, { headers: { 'Authorization': `Basic ${auth}` } });
                if (msgRes.ok) {
                    const msgData = await msgRes.json();
                    setDescInput(msgData.comment);
                    diff = `Msg: ${msgData.comment}\n` + diff;
                }
            } catch (ign) { }

            setDiffInput(diff);
            setStatusMsg({ msg: "Diff carregado via Azure", type: 'success' });
            saveConfig();
        } catch (e: any) {
            setStatusMsg({ msg: e.message, type: 'error' });
        } finally { setLoading(false); }
    };

    // --- HEURISTIC ENGINE ---
    const classifyComplexity = (filesCount: number, text: string, domain: string): { complexity: 'baixa' | 'media' | 'alta' | 'unica', taskId: string } => {
        // Regras Portadas
        const textLower = text.toLowerCase();

        // 1. Task ID Logic
        if (textLower.includes("merge")) return { taskId: "36", complexity: "unica" };
        if (textLower.includes("deploy") || textLower.includes("implantação")) return { taskId: "34", complexity: "unica" };
        if (textLower.includes("relatorio") || textLower.includes("relatório")) {
            // Relatorio Rules
            let comp: 'baixa' | 'media' | 'alta' = 'baixa';
            if (filesCount > 5) comp = 'media';
            if (filesCount > 10) comp = 'alta';
            return { taskId: "14", complexity: comp };
        }
        if (textLower.includes("script") || domain === 'Database') {
            if (textLower.includes("criar") || textLower.includes("create")) return { taskId: "38", complexity: "unica" };
            // analise
            return { taskId: "10", complexity: "baixa" };
        }
        if (domain === 'Test') return { taskId: "25", complexity: "unica" };
        if (domain === 'Meeting') return { taskId: "65", complexity: "unica" };

        // Default: Implementação (17)
        let score = 1;
        if (filesCount > 10) score = 3;
        else if (filesCount >= 4) score = 2;

        if (textLower.match(/(complexo|grande|refatoração total|migração|arquitetura|integração)/)) score = Math.max(score, 3);
        else if (textLower.match(/(novo|nova|criar|implementar|feature|recurso|desenvolver)/)) score = Math.max(score, 2);

        let complexity: 'baixa' | 'media' | 'alta' = 'baixa';
        if (score >= 3) complexity = 'alta';
        else if (score === 2) complexity = 'media';

        return { taskId: "17", complexity };
    };

    const processHeuristic = () => {
        saveConfig();
        if (!descInput && !diffInput) return setStatusMsg({ msg: "Sem dados para processar", type: 'error' });

        const newTasks: Task[] = [];

        // Split functionality based on diff files
        const files = diffInput.match(/[-*] (\[.*?\])?\s?([a-zA-Z0-9_/\\.-]+)/g) || [''];

        // Group by Domain
        const domains: Record<string, number> = { Frontend: 0, Backend: 0, Database: 0, Test: 0, Config: 0 };

        files.forEach(f => {
            const path = f.toLowerCase();
            if (path.includes('.tsx') || path.includes('.css') || path.includes('.html') || path.includes('clientapp')) domains.Frontend++;
            else if (path.includes('.cs') || path.includes('controller') || path.includes('service') || path.includes('api')) domains.Backend++;
            else if (path.includes('.sql')) domains.Database++;
            else if (path.includes('test') || path.includes('spec')) domains.Test++;
            else domains.Config++;
        });

        const activeDomains = Object.entries(domains).filter(([_, count]) => count > 0);

        // If no file heuristic (manual entry usually), treat as single generic
        if (activeDomains.length === 0) activeDomains.push(['Geral', 1]);

        activeDomains.forEach(([domain, count]) => {
            const rules = classifyComplexity(count, descInput, domain);

            // Find KB
            let kbIndex = KNOWLEDGE_BASE.findIndex(k => k.id === rules.taskId);
            if (kbIndex === -1) kbIndex = 2; // Default to Impl

            const kb = KNOWLEDGE_BASE[kbIndex];
            // Safe access complexity points
            const points = (kb.complexities as any)[rules.complexity] || Object.values(kb.complexities)[0];

            newTasks.push({
                taskId: kb.id,
                kbIndex,
                complexity: rules.complexity,
                ustPoints: points,
                estimateMade: 0,
                customTitle: titleFromDomain(domain, descInput),
                coherentDescription: descInput || "Alterações realizadas nos arquivos do sistema.",
                source: "Heurística (Auto)"
            });
        });

        setTasks(newTasks);
        setStatusMsg({ msg: `Gerado: ${newTasks.length} tarefas via regras.`, type: 'success' });
        setViewConfig(false); // Collapse config to show results
    };

    const titleFromDomain = (domain: string, desc: string): string => {
        const cleanDesc = desc.split('\n')[0].substring(0, 50);
        if (domain === 'Geral') return cleanDesc || "Nova Tarefa";
        return `${domain} - ${cleanDesc}`;
    }

    // --- AI REFINEMENT ---
    const refineWithAI = async () => {
        if (!process.env.API_KEY) return setStatusMsg({ msg: "API Key não configurada no ambiente", type: 'error' });

        setLoadingAi(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Aja como Tech Lead. Quebre o trabalho a seguir em tarefas faturáveis (lista JSON).
                DESCRIÇÃO: ${descInput}
                DIFF SUMMARY: ${diffInput.substring(0, 5000)}
                
                REGRAS:
                - Separe Frontend, Backend, Banco de Dados.
                - JSON array de objetos: { "summary": "titulo curto", "description": "descrição detalhada técnica" }
            `;


            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp', // Or 'gemini-1.5-flash'
                contents: prompt,
            });
            debugger
            const responseText = response.text;

            // Parse JSON
            const jsonMatch = responseText.match(/\[.*\]/s);
            if (!jsonMatch) throw new Error("IA não retornou JSON válido");

            const aiItems = JSON.parse(jsonMatch[0]);

            // Convert AI items to Heuristic Tasks
            const convertedTasks = aiItems.map((item: any) => {
                // Re-run classifier on AI output
                const rules = classifyComplexity(1, item.summary + " " + item.description, "Geral");
                let kbIndex = KNOWLEDGE_BASE.findIndex(k => k.id === rules.taskId);
                if (kbIndex === -1) kbIndex = 2;
                const kb = KNOWLEDGE_BASE[kbIndex];
                const points = (kb.complexities as any)[rules.complexity] || Object.values(kb.complexities)[0];

                return {
                    taskId: kb.id,
                    kbIndex,
                    complexity: rules.complexity,
                    ustPoints: points,
                    estimateMade: 0,
                    customTitle: item.summary,
                    coherentDescription: item.description,
                    source: "IA Refinada"
                }
            });

            setTasks(convertedTasks);
            setStatusMsg({ msg: "Tarefas refinadas com IA!", type: 'success' });

        } catch (e: any) {
            setStatusMsg({ msg: "Erro IA: " + e.message, type: 'error' });
        } finally {
            setLoadingAi(false);
        }
    };


    // --- EXPORT ---
    const exportCsv = () => {
        if (tasks.length === 0) return;

        let csv = "ID,Work Item Type,Title,Assigned To,State,ID SPF,Effort,UST,Activity,Complexidade,Area Path,Iteration Path,Description\n";

        const area = config.areaPath || "Area\\Path";
        // Logic for full iteration path based on snippet
        let fullIter = config.iterationPath;
        if (config.areaPath.includes('Refatoração')) fullIter = `SPF-SIAFIC\\Refatoração\\Refatoração - ${config.iterationPath}`;
        else if (config.areaPath.includes('Fábrica')) fullIter = `SPF-SIAFIC\\SPF Fábrica\\SPF - ${config.iterationPath}`;

        tasks.forEach(t => {
            const tit = `"${t.customTitle.replace(/"/g, '""')}"`;
            const desc = `"${t.coherentDescription.replace(/"/g, '""')}"`;
            let comp = t.complexity === 'unica' ? 'ÚNICA' : t.complexity.toUpperCase();

            csv += `,"Task",${tit},"${config.assignedTo}","To Do","${t.taskId}","${t.estimateMade}","${t.ustPoints}","Development","${comp}","${area}","${fullIter}",${desc}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `tasks_${Date.now()}.csv`;
        link.click();
    };


    // --- UI HELPERS ---
    const updateTask = (index: number, field: keyof Task, value: any) => {
        const newTasks = [...tasks];
        const task = newTasks[index];
        (task as any)[field] = value;

        // Update derivatives
        if (field === 'kbIndex') {
            const kb = KNOWLEDGE_BASE[value];
            task.taskId = kb.id;
            // Reset complexity to first available
            const firstComp = Object.keys(kb.complexities)[0] as any;
            task.complexity = firstComp;
            task.ustPoints = (kb.complexities as any)[firstComp];
        } else if (field === 'complexity') {
            const kb = KNOWLEDGE_BASE[task.kbIndex];
            task.ustPoints = (kb.complexities as any)[value] || 0;
        }

        setTasks(newTasks);
    };

    const removeTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    const badgeColor = (c: string) => {
        if (c === 'baixa') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (c === 'media') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        if (c === 'alta') return 'bg-red-500/20 text-red-400 border-red-500/30';
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    };


    return (
        <div className="space-y-6">

            {/* CONFIGURATION PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setViewConfig(!viewConfig)}
                    className="w-full flex items-center justify-between p-4 bg-slate-950/50 hover:bg-slate-900 transition-colors"
                >
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                        <RotateCcw size={16} className="text-emerald-500" /> Configuração & Origem
                    </h3>
                    {viewConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {viewConfig && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                        {/* 1. Global Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Assigned To</label>
                                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm"
                                    value={config.assignedTo} onChange={e => setConfig({ ...config, assignedTo: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Iteration Path</label>
                                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm" placeholder="ex: 35"
                                    value={config.iterationPath} onChange={e => setConfig({ ...config, iterationPath: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Area Path</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm"
                                    value={config.areaPath} onChange={e => setConfig({ ...config, areaPath: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    <option value="SPF-SIAFIC\Refatoração">Refatoração</option>
                                    <option value="SPF-SIAFIC\SPF Fábrica">Fábrica</option>
                                </select>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 my-4" />

                        {/* 2. Source Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Azure */}
                            <div className={`p-4 rounded-xl border transition-all ${provider === 'azure' ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-950 border-slate-800 opacity-50'}`}>
                                <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">Azure DevOps</h4>
                                <div className="space-y-3">
                                    <input type="text" placeholder="URL do Repo (Clone URL)" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                                        value={config.azUrl} onChange={e => setConfig({ ...config, azUrl: e.target.value })} />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Commit SHA" className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono"
                                            value={config.azCommit} onChange={e => setConfig({ ...config, azCommit: e.target.value })} />
                                        <button onClick={fetchAzure} disabled={loading || provider !== 'azure'} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold disabled:opacity-50">
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                        </button>
                                    </div>
                                    <input type="password" placeholder="PAT Token (Opcional se já logado)" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                                        value={config.azToken} onChange={e => setConfig({ ...config, azToken: e.target.value })} />
                                </div>
                            </div>

                            {/* GitHub */}
                            <div className={`p-4 rounded-xl border transition-all ${provider === 'github' ? 'bg-slate-800 border-slate-600' : 'bg-slate-950 border-slate-800 opacity-50'}`}>
                                <h4 className="font-bold text-slate-300 mb-3 flex items-center gap-2">GitHub</h4>
                                <div className="space-y-3">
                                    <input type="text" placeholder="Owner/Repo" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                                        value={config.ghRepo} onChange={e => setConfig({ ...config, ghRepo: e.target.value })} />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Commit SHA" className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono"
                                            value={config.ghCommit} onChange={e => setConfig({ ...config, ghCommit: e.target.value })} />
                                        <button onClick={fetchGitHub} disabled={loading || provider !== 'github'} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold disabled:opacity-50">
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        {statusMsg && (
                            <div className={`p-3 rounded text-xs font-bold flex items-center gap-2 ${statusMsg.type === 'error' ? 'bg-red-500/10 text-red-400' : statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                {/* {statusMsg.type === 'loading' && <Loader2 size={12} className="animate-spin" />} */}
                                {statusMsg.msg}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Descrição Técnica</label>
                    <textarea
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                        placeholder="Descreva o que foi feito..."
                        value={descInput}
                        onChange={e => setDescInput(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Diff / Arquivos Afetados</label>
                    <textarea
                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                        placeholder="Cole o diff ou lista de arquivos..."
                        value={diffInput}
                        onChange={e => setDiffInput(e.target.value)}
                    />
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center gap-4">
                <button
                    onClick={processHeuristic}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
                >
                    <Play size={18} /> Gerar Tarefas (Rápido)
                </button>
                <button
                    onClick={refineWithAI}
                    disabled={loadingAi}
                    className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loadingAi ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    IA Magic
                </button>
            </div>

            {/* RESULTS AREA */}
            {tasks.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" size={18} />
                            Tarefas Geradas <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{tasks.length}</span>
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setTasks([])} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all">
                                <FileText size={16} /> Exportar CSV
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {tasks.map((task, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-slate-950 rounded text-slate-400 font-mono text-xs border border-slate-800">
                                        #{task.taskId}
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 outline-none text-white font-semibold placeholder-slate-600 transition-colors"
                                                value={task.customTitle}
                                                onChange={e => updateTask(idx, 'customTitle', e.target.value)}
                                            />
                                            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider self-center">{task.source}</span>
                                        </div>

                                        <textarea
                                            className="w-full bg-slate-950/50 rounded p-2 text-sm text-slate-300 outline-none border border-transparent focus:border-slate-700 resize-none"
                                            rows={2}
                                            value={task.coherentDescription}
                                            onChange={e => updateTask(idx, 'coherentDescription', e.target.value)}
                                        />

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Categoria</label>
                                                <select
                                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                                                    value={task.kbIndex}
                                                    onChange={e => updateTask(idx, 'kbIndex', parseInt(e.target.value))}
                                                >
                                                    {KNOWLEDGE_BASE.map((k, i) => (
                                                        <option key={k.id} value={i}>{k.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Complexidade</label>
                                                <select
                                                    className={`bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs outline-none font-bold ${task.complexity === 'alta' ? 'text-red-400' : task.complexity === 'media' ? 'text-yellow-400' : 'text-emerald-400'
                                                        }`}
                                                    value={task.complexity}
                                                    onChange={e => updateTask(idx, 'complexity', e.target.value)}
                                                >
                                                    {Object.keys(KNOWLEDGE_BASE[task.kbIndex].complexities).map(c => (
                                                        <option key={c} value={c}>{c.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">UST</label>
                                                <div className={`px-2 py-1 rounded text-xs font-mono font-bold border ${badgeColor(task.complexity)}`}>
                                                    {task.ustPoints}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Horas</label>
                                                <input
                                                    type="number"
                                                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-center text-white"
                                                    value={task.estimateMade}
                                                    onChange={e => updateTask(idx, 'estimateMade', parseFloat(e.target.value))}
                                                />
                                            </div>

                                            <button
                                                onClick={() => removeTask(idx)}
                                                className="ml-auto text-slate-600 hover:text-red-400 transition-colors"
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

export default TaskGenerator;