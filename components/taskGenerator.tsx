import React, { useState, useEffect } from "react";
import { Provider, UserContext, AzureRepository, AIConfig } from "../types";
import { fetchAreaPaths, fetchRecentCommitsForRepo, fetchWorkItemsByType } from "../services/azure";
import {
  fetchGitHubCommitDiff,
  fetchAzureCommitDiff,
  refineTaskWithAI,
} from "../services/taskGenerator";
import { Task, KNOWLEDGE_BASE } from "./TaskWizard/types";
import { WizardProgress } from "./TaskWizard/WizardProgress";
import { Step1Context } from "./TaskWizard/Step1Context";
import { Step2Code } from "./TaskWizard/Step2Code";
import { Step3Review } from "./TaskWizard/Step3Review";

interface TaskGeneratorProps {
  provider: Provider;
  token?: string;
  username: string;
  userContext: UserContext;
  azureConfig?: { org: string; token: string; aliases: string[] } | null;
  selectedRepos?: AzureRepository[];
  aiConfig: AIConfig;
}

const TaskGenerator: React.FC<TaskGeneratorProps> = ({
  provider,
  token,
  username,
  userContext,
  azureConfig,
  selectedRepos,
  aiConfig,
}) => {
  // -- STATE --
  const [config, setConfig] = useState({
    assignedTo: username || "",
    iterationPath: "",
    areaPath: "",
    ghRepo: "",
    ghCommit: "",
    azUrl: "",
    azCommit: "",
    contractItem: "",
    azToken: token || "",
  });

  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [areaPaths, setAreaPaths] = useState<string[]>([]);
  const [contractItems, setContractItems] = useState<{ id: string; title: string }[]>([]);
  const [recentCommits, setRecentCommits] = useState<any[]>([]);
  const [selectedCommitIds, setSelectedCommitIds] = useState<string[]>([]);

  const [descInput, setDescInput] = useState("");
  const [diffInput, setDiffInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    msg: string;
    type: "success" | "error" | "neutral";
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [viewConfig, setViewConfig] = useState(true);
  const [filterAuthor, setFilterAuthor] = useState("");

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const cancelAiProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    const load = (key: string) => localStorage.getItem("tg_" + key) || "";
    const savedArea = load("areaPath");
    const savedContract = load("contractItem");
    setConfig((prev) => ({
      ...prev,
      assignedTo: load("assignedTo") || prev.assignedTo,
      iterationPath: load("iterationPath"),
      areaPath: (!savedArea || savedArea === "teste" || savedArea === "test") ? "SPF-SIAFIC\\SPF Fábrica" : savedArea,
      ghRepo: load("ghRepo"),
      azUrl: load("azUrl"),
      contractItem: (!savedContract || savedContract === "Item" || savedContract === "item") ? "Item 2" : savedContract,
    }));
  }, []);

  useEffect(() => {
    if (selectedRepos && selectedRepos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(selectedRepos[0].id);
    }
  }, [selectedRepos]);

  useEffect(() => {
    if (!selectedRepoId || !azureConfig || !selectedRepos) return;

    const repo = selectedRepos.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const paths = await fetchAreaPaths(
          azureConfig.org,
          repo.project.name,
          azureConfig.token
        );
        setAreaPaths(paths);

        const commits = await fetchRecentCommitsForRepo(
          azureConfig.org,
          repo.project.name,
          repo.id,
          azureConfig.token
        );
        setRecentCommits(commits);

        const items = await fetchWorkItemsByType(
          azureConfig.org,
          repo.project.name,
          'Item Contrato',
          azureConfig.token
        );
        setContractItems(items);
        setStatusMsg(null);
      } catch (e: any) {
        console.error(e);
        setStatusMsg({ msg: e.message || "Falha de conexão com a API do Azure.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedRepoId, azureConfig, selectedRepos, reloadTrigger]);

  const saveConfig = () => {
    Object.entries(config).forEach(([k, v]) => {
      if (v && k !== "azToken" && k !== "ghCommit" && k !== "azCommit") {
        localStorage.setItem("tg_" + k, v as string);
      }
    });
  };

  const handleCommitSelect = (commitId: string) => {
    let newIds: string[] = [];
    setSelectedCommitIds((prev) => {
      newIds = prev.includes(commitId) ? prev.filter((id) => id !== commitId) : [...prev, commitId];
      return newIds;
    });

    if (!selectedRepos || !azureConfig) return;

    const repo = selectedRepos.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    const cloneUrl = `https://dev.azure.com/${azureConfig.org}/${repo.project.name}/_git/${repo.name}`;

    setTimeout(() => {
      setConfig((prev) => ({
        ...prev,
        azUrl: cloneUrl,
        azCommit: newIds.join(","),
      }));
    }, 0);
  };

  const fetchGitHub = async () => {
    if (!config.ghRepo || !config.ghCommit)
      return setStatusMsg({ msg: "Preencha Repo e Commit", type: "error" });
    setLoading(true);
    setStatusMsg({ msg: "Buscando GitHub...", type: "neutral" });
    try {
      const data = await fetchGitHubCommitDiff(
        config.ghRepo,
        config.ghCommit,
        config.azToken
      );

      setDiffInput(data.diff);
      setDescInput(data.description);
      setStatusMsg({ msg: "Diff carregado via GitHub", type: "success" });
      saveConfig();
    } catch (e: any) {
      setStatusMsg({ msg: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAzure = async () => {
    if (!config.azUrl || selectedCommitIds.length === 0 || !config.azToken)
      return setStatusMsg({
        msg: "Preencha URL, selecione os Commits e Token",
        type: "error",
      });

    setLoading(true);
    setStatusMsg({ msg: "Buscando Diff(s) no Azure...", type: "neutral" });
    try {
      let fullDiff = "";
      let fullDesc = "";

      for (const commitId of selectedCommitIds) {
        const data = await fetchAzureCommitDiff(
          config.azUrl,
          commitId,
          config.azToken
        );
        fullDiff += data.diff + "\n\n";
        fullDesc += data.description + "\n\n";
      }

      setDiffInput(fullDiff.trim());
      setDescInput(fullDesc.trim());
      setStatusMsg({ msg: `Diff de ${selectedCommitIds.length} commit(s) carregado via Azure`, type: "success" });
      saveConfig();
    } catch (e: any) {
      setStatusMsg({ msg: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const classifyComplexity = (
    filesCount: number,
    text: string,
    domain: string
  ): { complexity: "baixa" | "media" | "alta" | "unica"; taskId: string } => {
    const textLower = text.toLowerCase();

    if (textLower.includes("merge"))
      return { taskId: "36", complexity: "unica" };
    if (textLower.includes("deploy") || textLower.includes("implantação"))
      return { taskId: "34", complexity: "unica" };
    if (textLower.includes("relatorio") || textLower.includes("relatório")) {
      let comp: "baixa" | "media" | "alta" = "baixa";
      if (filesCount > 5) comp = "media";
      if (filesCount > 10) comp = "alta";
      return { taskId: "14", complexity: comp };
    }
    if (textLower.includes("script") || domain === "Database") {
      if (textLower.includes("criar") || textLower.includes("create"))
        return { taskId: "38", complexity: "unica" };
      return { taskId: "10", complexity: "baixa" };
    }
    if (textLower.includes("teste") || textLower.includes("testes") || domain === "Test") return { taskId: "25", complexity: "unica" };
    if (domain === "Meeting") return { taskId: "65", complexity: "unica" };

    let score = 1;
    if (filesCount > 10) score = 3;
    else if (filesCount >= 4) score = 2;

    if (
      textLower.match(
        /(complexo|grande|refatoração total|migração|arquitetura|integração)/
      )
    )
      score = Math.max(score, 3);
    else if (
      textLower.match(
        /(novo|nova|criar|implementar|feature|recurso|desenvolver)/
      )
    )
      score = Math.max(score, 2);

    let complexity: "baixa" | "media" | "alta" = "baixa";
    if (score >= 3) complexity = "alta";
    else if (score === 2) complexity = "media";

    return { taskId: "17", complexity };
  };

  const processHeuristic = () => {
    saveConfig();
    if (!config.areaPath) {
      return setStatusMsg({ msg: "Erro: Area Path é obrigatório.", type: "error" });
    }
    if (!config.iterationPath) {
      return setStatusMsg({ msg: "Erro: Iteration Path é obrigatório.", type: "error" });
    }
    if (!config.contractItem) {
      return setStatusMsg({ msg: "Erro: Item Contrato é obrigatório.", type: "error" });
    }
    if (!diffInput && !config.azCommit && !descInput) {
      return setStatusMsg({ msg: "Erro: Forneça um Diff, selecione um Commit ou preencha a Descrição.", type: "error" });
    }

    if (config.assignedTo && config.assignedTo.includes(" ")) {
      const formattedName = config.assignedTo
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ".");
      setConfig((prev) => ({ ...prev, assignedTo: formattedName }));
    }

    const newTasks: Task[] = [];
    const files = diffInput.match(
      /[-*] (\[.*?\])?\s?([a-zA-Z0-9_/\\.-]+)/g
    ) || [""];

    const domains: Record<string, number> = {
      Frontend: 0,
      Backend: 0,
      Database: 0,
      Test: 0,
      Config: 0,
    };

    files.forEach((f) => {
      const path = f.toLowerCase();
      if (
        path.includes(".tsx") ||
        path.includes(".css") ||
        path.includes(".html") ||
        path.includes("clientapp")
      )
        domains.Frontend++;
      else if (
        path.includes(".cs") ||
        path.includes("controller") ||
        path.includes("service") ||
        path.includes("api")
      )
        domains.Backend++;
      else if (path.includes(".sql")) domains.Database++;
      else if (path.includes("test") || path.includes("spec")) domains.Test++;
      else domains.Config++;
    });

    const activeDomains = Object.entries(domains).filter(
      ([_, count]) => count > 0
    );

    if (activeDomains.length === 0) activeDomains.push(["Geral", 1]);

    activeDomains.forEach(([domain, count]) => {
      const rules = classifyComplexity(count, descInput, domain);
      let kbIndex = KNOWLEDGE_BASE.findIndex((k) => k.id === rules.taskId);
      if (kbIndex === -1) kbIndex = 2;

      const kb = KNOWLEDGE_BASE[kbIndex];
      const points =
        (kb.complexities as any)[rules.complexity] ||
        Object.values(kb.complexities)[0];

      let defaultEstimate = 0.5;
      if (rules.complexity === "media") defaultEstimate = 1;
      if (rules.complexity === "alta" || rules.complexity === "unica") defaultEstimate = 2;

      newTasks.push({
        taskId: kb.id,
        kbIndex,
        complexity: rules.complexity as any,
        ustPoints: points,
        estimateMade: defaultEstimate,
        customTitle: titleFromDomain(domain, descInput),
        coherentDescription:
          descInput || "Alterações realizadas nos arquivos do sistema.",
        source: "Heurística (Auto)",
        relatedCommitId: config.azCommit || config.ghCommit,
        relatedCommitUrl: (config.azUrl && config.azCommit)
          ? `${config.azUrl}/commit/${config.azCommit}`
          : (config.ghRepo && config.ghCommit)
            ? `https://github.com/${config.ghRepo}/commit/${config.ghCommit}`
            : undefined,
        contractItem: config.contractItem,
      });
    });

    setTasks(newTasks);
    setStatusMsg({
      msg: `Gerado: ${newTasks.length} tarefas via regras.`,
      type: "success",
    });
    setViewConfig(false);
  };

  const titleFromDomain = (domain: string, desc: string): string => {
    const cleanDesc = desc.split("\n")[0].substring(0, 50);
    if (domain === "Geral") return cleanDesc || "Nova Tarefa";
    return `${domain} - ${cleanDesc}`;
  };

  const refineWithAI = async () => {
    if (!config.areaPath) {
      return setStatusMsg({ msg: "Erro: Area Path é obrigatório.", type: "error" });
    }
    if (!config.iterationPath) {
      return setStatusMsg({ msg: "Erro: Iteration Path é obrigatório.", type: "error" });
    }
    if (!config.contractItem) {
      return setStatusMsg({ msg: "Erro: Item Contrato é obrigatório.", type: "error" });
    }
    if (!diffInput && !config.azCommit && !descInput) {
      return setStatusMsg({ msg: "Erro: Forneça um Diff, selecione um Commit ou preencha a Descrição.", type: "error" });
    }

    if (config.assignedTo && config.assignedTo.includes(" ")) {
      const formattedName = config.assignedTo
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ".");
      setConfig((prev) => ({ ...prev, assignedTo: formattedName }));
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingAi(true);
    try {
      const aiItems = await refineTaskWithAI(descInput, diffInput, aiConfig, controller.signal);
      const convertedTasks = aiItems.map((item: any) => {
        const rules = classifyComplexity(
          1,
          item.summary + " " + item.description,
          "Geral"
        );
        let kbIndex = KNOWLEDGE_BASE.findIndex((k) => k.id === rules.taskId);
        if (kbIndex === -1) kbIndex = 2;
        const kb = KNOWLEDGE_BASE[kbIndex];
        const points =
          (kb.complexities as any)[rules.complexity] ||
          Object.values(kb.complexities)[0];

        let defaultEstimate = 0.5;
        if (rules.complexity === "media") defaultEstimate = 1;
        if (rules.complexity === "alta" || rules.complexity === "unica") defaultEstimate = 2;

        return {
          taskId: kb.id,
          kbIndex,
          complexity: rules.complexity,
          ustPoints: points,
          estimateMade: defaultEstimate,
          customTitle: item.summary,
          coherentDescription: item.description,
          source: `IA Refinada (${aiConfig.provider === 'gemini' ? 'Gemini' : 'DeepSeek'})`,
          relatedCommitId: config.azCommit || config.ghCommit,
          relatedCommitUrl: (config.azUrl && config.azCommit)
            ? `${config.azUrl}/commit/${config.azCommit}`
            : (config.ghRepo && config.ghCommit)
              ? `https://github.com/${config.ghRepo}/commit/${config.ghCommit}`
              : undefined,
          contractItem: config.contractItem,
        };
      });

      setTasks(convertedTasks);
      setStatusMsg({ msg: "Tarefas refinadas com IA!", type: "success" });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setStatusMsg({ msg: "Processamento de IA cancelado pelo usuário.", type: "neutral" });
      } else {
        setStatusMsg({ msg: "Erro IA: " + e.message, type: "error" });
      }
    } finally {
      setLoadingAi(false);
      abortControllerRef.current = null;
    }
  };

  const exportCsv = () => {
    if (tasks.length === 0) return;

    let csv =
      "ID,Work Item Type,Title,Assigned To,State,ID SPF,Effort,Estimate Made,Item Contrato,UST,Activity,Complexidade,Area Path,Iteration Path,Description\n";

    const area = config.areaPath || "Area\\Path";
    let fullIter = config.iterationPath;
    if (config.areaPath.includes("Refatoração")) {
      fullIter = `SPF-SIAFIC\\Refatoração\\Refatoração - ${config.iterationPath}`;
    } else if (config.areaPath.includes("Fábrica")) {
      fullIter = `SPF-SIAFIC\\SPF Fábrica\\SPF - ${config.iterationPath}`;
    } else if (config.areaPath.includes("SIAFIC Asp.Net Core") || config.areaPath.includes("Siafic Asp.Net Core")) {
      fullIter = `SPF-SIAFIC\\Siafic Asp.Net Core\\Siafic Asp.Net Core - ${config.iterationPath}`;
    } else {
      if (!config.iterationPath.includes("\\")) {
        const parts = config.areaPath.split('\\');
        if (parts.length > 0) {
          fullIter = `${parts[0]}\\${parts[1] || parts[0]}\\${config.iterationPath}`;
        }
      }
    }

    tasks.forEach((t, index) => {
      const tit = `"${t.customTitle.replace(/"/g, '""')}"`;
      const descContent = t.coherentDescription;
      const desc = `"${descContent.replace(/"/g, '""')}"`;

      let comp =
        t.complexity === "unica" ? "ÚNICA" : t.complexity.toUpperCase();

      const row = [
        "",
        "Task",
        tit,
        `"${config.assignedTo}"`,
        "To Do",
        `"${t.taskId}"`,
        `"${t.estimateMade ?? 0}"`,
        `"${t.estimateMade ?? 0}"`,
        `"${t.contractItem}"`,
        `"${t.ustPoints}"`,
        "Development",
        `"${comp}"`,
        `"${area}"`,
        `"${fullIter}"`,
        desc,
      ].join(",");

      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_${Date.now()}.csv`;
    link.click();
  };

  const updateTask = (index: number, field: keyof Task, value: any) => {
    const newTasks = [...tasks];
    const task = newTasks[index];
    (task as any)[field] = value;

    if (field === "kbIndex") {
      const kb = KNOWLEDGE_BASE[value];
      task.taskId = kb.id;
      const firstComp = Object.keys(kb.complexities)[0] as any;
      task.complexity = firstComp;
      task.ustPoints = (kb.complexities as any)[firstComp];

      if (firstComp === "media") task.estimateMade = 1;
      else if (firstComp === "alta" || firstComp === "unica") task.estimateMade = 2;
      else task.estimateMade = 0.5;

    } else if (field === "complexity") {
      const kb = KNOWLEDGE_BASE[task.kbIndex];
      task.ustPoints = (kb.complexities as any)[value] || 0;

      if (value === "media") task.estimateMade = 1;
      else if (value === "alta" || value === "unica") task.estimateMade = 2;
      else task.estimateMade = 0.5;
    }

    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const badgeColor = (c: string) => {
    if (c === "baixa")
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (c === "media")
      return "bg-accent-light0/20 text-accent border-accent-light0/30";
    if (c === "alta") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-accent-light0/20 text-accent border-accent-light0/30";
  };

  const handleNextStep1 = () => {
    if (!config.areaPath || !config.iterationPath || !config.contractItem) {
      setStatusMsg({ msg: "Preencha Área, Iteration Path e Item Contrato para prosseguir.", type: "error" });
      return;
    }
    setStatusMsg(null);
    setCurrentStep(2);
  };

  const handleSkipCode = () => {
    if (!config.areaPath || !config.iterationPath || !config.contractItem) {
      setStatusMsg({ msg: "Preencha Área, Iteration Path e Item Contrato para prosseguir.", type: "error" });
      return;
    }
    if (!descInput.trim()) {
      setStatusMsg({ msg: "Para pular o código, é obrigatório preencher a Descrição Técnica.", type: "error" });
      return;
    }
    setStatusMsg(null);
    setDiffInput("");
    setConfig(prev => ({ ...prev, azCommit: "", ghCommit: "" }));
    setCurrentStep(3);
  };

  const handleNextStep2 = () => {
    if (!diffInput && !config.azCommit) {
      setStatusMsg({ msg: "Forneça um Diff ou selecione um Commit para prosseguir.", type: "error" });
      return;
    }
    setStatusMsg(null);
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      <WizardProgress currentStep={currentStep} />

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-sm font-bold border ${statusMsg.type === "error"
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : statusMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-gray-800 text-accent-light/70 border-gray700"
            }`}
        >
          {statusMsg.msg}
        </div>
      )}

      {currentStep === 1 && (
        <Step1Context
          config={config}
          setConfig={setConfig}
          descInput={descInput}
          setDescInput={setDescInput}
          areaPaths={areaPaths}
          contractItems={contractItems}
          onNext={handleNextStep1}
          onSkipCode={handleSkipCode}
        />
      )}

      {currentStep === 2 && (
        <Step2Code
          config={config}
          setConfig={setConfig}
          diffInput={diffInput}
          setDiffInput={setDiffInput}
          azureConfig={azureConfig}
          selectedRepos={selectedRepos || []}
          selectedRepoId={selectedRepoId}
          setSelectedRepoId={setSelectedRepoId}
          filterAuthor={filterAuthor}
          setFilterAuthor={setFilterAuthor}
          recentCommits={recentCommits}
          setRecentCommits={setRecentCommits}
          selectedCommitIds={selectedCommitIds}
          handleCommitSelect={handleCommitSelect}
          loading={loading}
          setLoading={setLoading}
          fetchAzure={fetchAzure}
          setStatusMsg={setStatusMsg}
          onBack={() => setCurrentStep(1)}
          onNext={handleNextStep2}
          processHeuristic={processHeuristic}
        />
      )}

      {currentStep === 3 && (
        <Step3Review
          tasks={tasks}
          setTasks={setTasks}
          loadingAi={loadingAi}
          refineWithAI={refineWithAI}
          exportCsv={exportCsv}
          updateTask={updateTask}
          removeTask={removeTask}
          badgeColor={badgeColor}
          onBack={() => setCurrentStep(2)}
          onReset={() => {
            setTasks([]);
            setDiffInput("");
            setCurrentStep(1);
          }}
          cancelAiProcessing={cancelAiProcessing}
        />
      )}
    </div>
  );
};

export default TaskGenerator;