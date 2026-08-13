import { parseAzureUrl } from './azure';
import * as Diff from 'diff';
import { AIConfig } from '../types';

const fetchAzureBlob = async (org: string, project: string, repo: string, sha: string, auth: string) => {
    if (!sha) return "";
    const url = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/blobs/${sha}?api-version=7.0`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'text/plain' } });
        if (!res.ok) return "";
        return await res.text();
    } catch {
        return "";
    }
};

// --- GITHUB ---
export const fetchGitHubCommitDiff = async (repo: string, commit: string, token?: string) => {
    const headers: any = {};
    if (token) headers['Authorization'] = `token ${token}`;

    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${commit}`, { headers });
    if (!res.ok) throw new Error("Erro GitHub API");
    const data = await res.json();

    let diff = `[GitHub Commit] ${data.commit.message}\nFiles:\n`;
    if (data.files) data.files.forEach((f: any) => diff += `- ${f.filename} (${f.status})\n`);

    return {
        description: data.commit.message,
        diff: diff // Formatted specifically for the inputs
    };
};

// --- AZURE ---
export const fetchAzureCommitDiff = async (repoUrl: string, commitSha: string, token: string) => {
    const meta = parseAzureUrl(repoUrl);
    if (!meta) throw new Error("URL Azure inválida");

    const auth = btoa(":" + token);
    const changesUrl = `https://dev.azure.com/${meta.org}/${meta.project}/_apis/git/repositories/${meta.repo}/commits/${commitSha}/changes?api-version=7.0`;

    // Fetch Changes
    const res = await fetch(changesUrl, { headers: { 'Authorization': `Basic ${auth}` } });
    if (res.status === 401 || res.status === 403) {
        throw new Error(`Acesso negado (${res.status}): O Token do Azure é inválido ou expirou. Verifique suas credenciais.`);
    }
    if (!res.ok) throw new Error(`Erro ${res.status}: Verifique token/permissões`);
    const data = await res.json();

    let rootDiff = `[Azure Commit] ${commitSha}\nFiles Alterados:\n`;
    if (data.changes) data.changes.forEach((c: any) => rootDiff += `- [${c.changeType}] ${c.item.path}\n`);

    // Fetch line-by-line diffs for each file
    let diffLines = "";
    if (data.changes) {
        // limit to 15 to avoid overloading browser requests
        const changesToProcess = Math.min(data.changes.length, 15);
        for (let i = 0; i < changesToProcess; i++) {
            const c = data.changes[i];

            // se o arquivo nao for adicionar ou deletar, e for muito grande, criar o diff pode pesar?
            // o ai aceita melhor os codigos
            let oldContent = "";
            let newContent = "";

            if (c.changeType !== "add" && c.item.originalObjectId) {
                oldContent = await fetchAzureBlob(meta.org, meta.project, meta.repo, c.item.originalObjectId, auth);
            }
            if (c.changeType !== "delete" && c.item.objectId) {
                newContent = await fetchAzureBlob(meta.org, meta.project, meta.repo, c.item.objectId, auth);
            }

            const filePatch = Diff.createPatch(c.item.path, oldContent, newContent);
            diffLines += `\n\n--- Arquivo: ${c.item.path} ---\n${filePatch}\n`;
        }

        if (data.changes.length > 15) {
            diffLines += `\n... mais ${data.changes.length - 15} arquivos omitidos por limite de carga ...\n`;
        }
    }

    let diff = rootDiff + diffLines;

    // Try fetching message (commit details)
    let description = "";
    try {
        const msgUrl = `https://dev.azure.com/${meta.org}/${meta.project}/_apis/git/repositories/${meta.repo}/commits/${commitSha}?api-version=7.0`;
        const msgRes = await fetch(msgUrl, { headers: { 'Authorization': `Basic ${auth}` } });
        if (msgRes.ok) {
            const msgData = await msgRes.json();
            description = msgData.comment;
            diff = `Msg: ${msgData.comment}\n` + diff;
        }
    } catch (ign) {
        // Ignore failure to get message
    }

    return {
        description,
        diff
    };
};

// --- AI REFINEMENT ---
export const refineTaskWithAI = async (description: string, diffSummary: string, aiConfig: AIConfig, signal?: AbortSignal) => {
    const apiKey = aiConfig.apiKey;

    if (!apiKey) throw new Error("API Key não configurada na aba de Configurações de IA.");

    const prompt = `
        Aja como um Desenvolvedor Sênior / Arquiteto de Soluções. Sua tarefa é pegar uma descrição de alto nível de uma funcionalidade e quebrá-la em um plano de trabalho detalhado, com tarefas faturáveis, usando a base de conhecimento fornecida. O objetivo é maximizar o detalhamento para um faturamento preciso.
        DESCRIÇÃO: ${description}
        DIFF SUMMARY: ${diffSummary.substring(0, 5000)}
        
        Instruções Detalhadas:
        1. Analise a descrição do usuário e identifique as tarefas correspondentes na base de conhecimento.
        2. Para cada tarefa, crie uma descrição coerente no tempo verbal passado.
        3. Escreva como se você tivesse feito a tarefa e está explicando para alguém oque foi feito.
        REGRAS:
        - IMPORTANTE EXTREMO: Você DEVE SEMPRE gerar uma tarefa no final do array "tasks" com o título "Execução de Testes Funcionais Não Automatizados (Manuais)", independentemente do que for solicitado. Na descrição dessa tarefa, detalhe as validações manuais que devem ser feitas no sistema para garantir o correto funcionamento das alterações.
        - IMPORTANTE EXTREMO: Se a descrição contiver uma lista de itens (ex: unidades gestoras, IDs, códigos) e solicitar a criação de uma tarefa para CADA item, você DEVE gerar um objeto separado dentro do array "tasks" para CADA item da lista, sem omitir ou agrupar nenhum. Adapte o título e a descrição individualmente para cada item conforme o modelo pedido.
        - Se 'relatório' for 'alterado', use a tarefa '...Relatório (Template)'.
        - Se 'Foi analisado', 'consulta' ou 'sql' forem mencionados, crie 'Análise de Sistema Legado'. Se 'consulta' ou 'sql' estiverem presentes, adicione também 'Analise para criação de Script', 'Elaboração de script' e 'Execução de Testes Funcionais...'.
        - Se 'supervisão', 'auxílio', 'alinhamento', ou 'reunião' forem mencionados, crie 'Supervisão técnica...'.
        - Separe Frontend, Backend, Banco de Dados.
        - Retorne um OBJETO JSON com a propriedade "tasks".
        - "tasks" deve ser um array de objetos: { "summary": "titulo curto", "description": "descrição detalhada técnica" }
    `;

    try {
        if (aiConfig.provider === 'gemini') {
            const response = await fetch(`/gemini-api/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: "You are a helpful assistant that outputs JSON." }] },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                }),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;
            const cleanContent = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
            const parsed = JSON.parse(cleanContent);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.tasks && Array.isArray(parsed.tasks)) return parsed.tasks;
            console.warn("Unexpected JSON structure:", parsed);
            return [];
        } else {
            const response = await fetch('/deepseek-api/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: "system", content: "You are a helpful assistant that outputs JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    stream: false
                }),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DeepSeek API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.tasks && Array.isArray(parsed.tasks)) return parsed.tasks;
            console.warn("Unexpected JSON structure:", parsed);
            return [];
        }
    } catch (e: any) {
        console.error("AI Request Failed:", e);
        throw new Error("Erro na IA: " + e.message);
    }
};