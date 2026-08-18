export interface Task {
    taskId: string;
    customTitle: string;
    coherentDescription: string;
    complexity: "baixa" | "media" | "alta" | "unica";
    ustPoints: number;
    estimateMade: number;
    source: string;
    kbIndex: number;
    relatedCommitId?: string;
    relatedCommitUrl?: string; // URL for hyperlink in description
    relatedCommitMsg?: string;
    contractItem?: string;
}

export interface RepoMeta {
    org?: string;
    proj?: string;
    repo?: string;
}

// -- KNOWLEDGE BASE --
// Mapeamento estático baseado no user request
export const KNOWLEDGE_BASE = [
    {
        id: "10",
        name: "Análise de Sistema Legado",
        complexities: { baixa: 3, media: 9, alta: 15 },
    },
    {
        id: "65",
        name: "Supervisão técnica (Codigo/Analise/Auxilio)",
        complexities: { unica: 10 },
    },
    {
        id: "17",
        name: "Implementação de novo Recurso (backend ou frontend)",
        complexities: { baixa: 8, media: 24, alta: 40 },
    },
    {
        id: "25",
        name: "Execução de Testes Funcionais (Manuais)",
        complexities: { unica: 5 },
    },
    { id: "38", name: "Elaboração de script", complexities: { unica: 5 } },
    {
        id: "14",
        name: "Implementação de Funcionalidade Relatório",
        complexities: { baixa: 11, media: 33, alta: 55 },
    },
    {
        id: "36",
        name: "Executar Merge em caso de conflitos",
        complexities: { unica: 1 },
    },
    {
        id: "34",
        name: "Implantação (Deployment) de aplicação",
        complexities: { unica: 1 },
    },
];
