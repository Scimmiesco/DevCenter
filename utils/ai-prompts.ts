import { UserContext, CategorizedCommit, CategoryType, SeniorityLevel, RoleType } from '../types';
import { getCategoryLabel } from './analyzer';

type ViewMode = 'daily' | 'sprint' | 'semester' | 'year';

// --- Helper Functions for Deterministic Logic ---

const getSeniorityInstructions = (level: SeniorityLevel): string => {
    switch (level) {
        case 'Intern':
        case 'Junior':
            return `
            Foco do Discurso: Aprendizado e Evolução.
            - Destaque o que você aprendeu com cada tarefa.
            - Mencione onde você teve dúvidas e como as superou.
            - Mostre entusiasmo e vontade de crescer.
            - Seja humilde, mas valorize suas pequenas vitórias.
            `;
        case 'Mid-Level':
            return `
            Foco do Discurso: Autonomia e Entrega.
            - Mostre que você consegue pegar uma task e levar até o fim.
            - Destaque a qualidade do seu código e boas práticas.
            - Mencione colaborações com outros devs (Code Reviews, Pair Programming).
            - Evite entrar em detalhes excessivamente técnicos irrelevantes para o negócio.
            `;
        case 'Senior':
            return `
            Foco do Discurso: Impacto e Decisões Técnicas.
            - Não liste apenas "o que" fez, mas "por que" fez.
            - Justifique suas escolhas de arquitetura ou design.
            - Destaque como suas entregas impactam a estabilidade ou performance do produto.
            - Mencione mentorias ou suporte dado ao time (se houver indícios).
            `;
        default:
            return "";
    }
};

const getRoleInstructions = (role: RoleType): string => {
    switch (role) {
        case 'Frontend':
            return `
            Perspectiva: Frontend Developer.
            - Dê ênfase em UX/UI, componentes visuais, responsividade e performance do cliente.
            - Mencione uso de React, Angular, CSS, estado e interações do usuário.
            `;
        case 'Backend':
            return `
            Perspectiva: Backend Developer.
            - Dê ênfase em APIs, banco de dados, performance, segurança e lógica de negócios.
            - Mencione arquitetura, integridade de dados e serviços.
            `;
        case 'Fullstack':
            return `
            Perspectiva: Fullstack Developer.
            - Mostre sua versatilidade navegando entre o cliente e o servidor.
            - Conecte as pontas: como o backend suporta a experiência do frontend.
            `;
        default:
            return "";
    }
};

export const buildPrompt = (
    context: UserContext,
    viewMode: ViewMode,
    username: string,
    filteredCommits: CategorizedCommit[],
    currentStats: Record<CategoryType, number>,
    commitsByRepo: Record<string, CategorizedCommit[]>
): string => {

    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // --- 1. Persona construction ---
    let personaInstruction = "";

    if (context.isHRMode) {
        personaInstruction = `
        VOCÊ ESTÁ ATUANDO COMO: Analista de Performance Sênior (RH/Tech).
        SEU OBJETIVO: Escrever um relatório analítico sobre o desempenho do desenvolvedor ${username}.
        
        DIRETRIZES DE RH:
        - Escreva SEMPRE na TERCEIRA PESSOA (ex: "O Pedro entregou...", "Ele demonstrou...").
        - Analise friamente os dados: volume, consistência e tipos de entrega.
        - Seja profissional, objetivo e fundamentado nos commits listados.
        - Não use gírias. Use terminologia corporativa de avaliação de desempenho.
        `;
    } else {
        const seniorityInst = getSeniorityInstructions(context.seniority);
        const roleInst = getRoleInstructions(context.role);

        personaInstruction = `
        VOCÊ ESTÁ ATUANDO COMO: O próprio desenvolvedor ${username}.
        SEU OBJETIVO: Criar um discurso natural para falar em uma reunião.

        SEU PERFIL:
        - Senioridade: ${context.seniority}
        - Atuação: ${context.role}

        ${seniorityInst}

        ${roleInst}

        DIRETRIZES DE PERSONALIDADE:
        - Fale na PRIMEIRA PESSOA (ex: "Eu fiz...", "Nós entregamos...").
        - Adapte a complexidade da fala ao seu nível de senioridade.
        `;
    }

    // --- 2. Specific View Strategy ---
    let viewInstruction = "";
    let dataFocus = "";

    switch (viewMode) {
        case 'daily':
            viewInstruction = `
        Cenário: **Daily Standup**.
        Estrutura do discurso:
        1. **Ontem**: O que foi concluído.
        2. **Hoje**: O que está em andamento.
        3. **Impedimentos**: Mencione se houver (ou diga que não há).
        
        Mantenha o tom rápido e objetivo.
      `;
            const todayCommits = filteredCommits.filter(c => new Date(c.date).toDateString() === today.toDateString());
            const pastCommits = filteredCommits.filter(c => new Date(c.date).toDateString() !== today.toDateString());

            dataFocus = `
        Commits de HOJE (${todayCommits.length}):
        ${todayCommits.map(c => `- ${c.message} (${c.repo})\n  Detalhes: ${c.body || 'Sem descrição adicional.'}`).join('\n')}

        Commits RECENTES (${pastCommits.length}):
        ${pastCommits.slice(0, 15).map(c => `- ${c.message} (${c.repo})`).join('\n')}
      `;
            break;

        case 'sprint':
            viewInstruction = `
        Cenário: **Sprint Review**.
        Você está apresentando suas entregas da sprint.
        Agrupe por funcionalidades entregues e fale sobre o valor gerado.
      `;
            dataFocus = `Commits da Sprint (Total ${filteredCommits.length}): \n` +
                filteredCommits.slice(0, 50).map(c => `[${c.repo}] ${c.message} (Tipo: ${c.category})\nDescrição: ${c.body || 'N/A'}`).join('\n');
            break;

        case 'semester':
            viewInstruction = `
        Cenário: **Feedback 1:1 Semestral**.
        Uma conversa estratégica com o gestor.
        Resuma sua evolução nos últimos 6 meses, grandes projetos e aprendizados.
      `;
            dataFocus = `Resumo do Semestre: \n` +
                `- Features: ${currentStats.FEATURE}\n` +
                `- Fixes: ${currentStats.FIX}\n` +
                `- Refactors: ${currentStats.REFACTOR}\n` +
                `Principais Projetos: ${Object.keys(commitsByRepo).join(', ')}`;
            break;

        case 'year':
            viewInstruction = `
        Cenário: **Retrospectiva Anual**.
        Uma visão holística do ano. Fale sobre constância, grandes marcos e como você cresceu profissionalmente.
      `;
            dataFocus = `Resumo Anual: \n` +
                Object.keys(commitsByRepo).map(repo => `Projeto ${repo}: ${commitsByRepo[repo].length} commits`).join('\n');
            break;
    }


    // --- 3. Final Assembly ---
    return `
    ${personaInstruction}

    ${viewInstruction}

    CONTEXTO TEMPORAL:
    - Data Atual: ${dateString}
    - Projetos Ativos: ${Object.keys(commitsByRepo).join(', ')}

    DADOS BRUTOS (FONTE DE VERDADE):
    ${dataFocus}

    REGRAS DE FORMATAÇÃO:
    1. Use Markdown para estruturar (Negrito para ênfase).
    2. Crie parágrafos curtos.
    3. NÃO invente dados que não estão na lista.
    4. Se usar Emojis, use com moderação adequada ao perfil.
  `;
};
