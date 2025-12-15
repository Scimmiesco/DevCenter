import { CategoryType, Commit, CategorizedCommit, YearStats, GitHubApiCommitItem, AzureApiCommitItem, RepoStat } from '../types';

export const parseCommits = (items: (GitHubApiCommitItem | AzureApiCommitItem)[]): Commit[] => {
  console.log(`⚙️[Analyzer] Normalizando ${items.length} itens brutos...`);
  if (items.length > 0) {

    console.log(`⚙️[Analyzer] Input Sample(First Item): `, items.find((item): item is AzureApiCommitItem => 'commitId' in item && item.commitId === '75d2a02a5a73452a585734bc43c1a6fec085ca19'));
  }
  const normalized = items.map(item => {
    let message = '';
    let fullMessage = '';
    let body = '';
    let date = '';
    let sha = '';
    let repo = '';
    let url = '';
    let branch: string | undefined = undefined;

    if ('commit' in item) {
      // GitHub
      fullMessage = item.commit.message;
      date = item.commit.committer.date;
      sha = item.sha;
      repo = item.repository.name;
      url = item.html_url;
    } else {
      // Azure
      fullMessage = item.comment;
      date = item.author.date;
      sha = item.commitId;
      // Extrair nome do repo da URL se possível, ou usar um padrão
      const repoMatch = item.remoteUrl.match(/_git\/([^/]+)\//);
      repo = repoMatch ? repoMatch[1] : 'Azure Repo';
      url = item.remoteUrl;
      branch = item.branch;
    }

    // Separar Título e Corpo
    const lines = fullMessage.split('\n');
    message = lines[0].trim();
    // Pega o restante, remove linhas vazias iniciais/finais e junta novamente
    if (lines.length > 1) {
      body = lines.slice(1).join('\n').trim();
    }

    // Prioriza a Branch real vinda do Azure (se existir).
    // Se não existir (Strategy 2 fallback), tenta inferir do texto ou retorna 'Geral'.
    const scope = branch && branch !== 'Geral' ? branch : extractScope(message);

    return {
      sha,
      message,
      fullMessage,
      body,
      date,
      repo,
      url,
      scope,
      branch
    };
  });

  if (normalized.length > 0) {
    console.log(`✅[Analyzer] Output Sample(First Normalized): `, normalized[0]);
  }
  console.log(`✅[Analyzer] ${normalized.length} commits normalizados.`);
  return normalized;
};

// Tenta extrair um "contexto" ou "branch" da mensagem do commit
const extractScope = (message: string): string => {
  const lowerMsg = message.toLowerCase();

  // 0. Sprint Branches patterns in message (fallback if API didn't give branch)
  const sprintMatch = message.match(/(Sprint[_-]?\d+)/i);
  if (sprintMatch) return sprintMatch[1];

  // 1. Conventional Commits: feat(scope): message
  const conventionalMatch = message.match(/^[a-z]+\(([^)]+)\):/i);
  if (conventionalMatch) return conventionalMatch[1].trim();

  // 2. Azure/Git Merges: Merged PR 123: ...
  if (lowerMsg.startsWith('merged pr')) return 'Merges & Reviews';
  if (lowerMsg.startsWith('merge branch')) return 'Merges';

  // 3. Brackets: [Scope] message
  const bracketMatch = message.match(/^\[([^\]]+)\]/);
  if (bracketMatch) return bracketMatch[1].trim();

  // 4. Prefixos comuns
  if (lowerMsg.startsWith('feat:')) return 'Features';
  if (lowerMsg.startsWith('fix:')) return 'Bugs';
  if (lowerMsg.startsWith('chore:')) return 'Manutenção';

  return 'Geral';
};

export const categorizeCommit = (message: string): CategoryType => {
  const lowerMsg = message.toLowerCase();

  // Feat / Add -> ✨
  if (/^(feat|add|new|create|implement|adiciona|inclui|novo)/.test(lowerMsg)) {
    return CategoryType.FEATURE;
  }

  // Fix / Bug -> 🛠️
  if (/^(fix|bug|resolve|patch|hotfix|correct|corrige|ajusta)/.test(lowerMsg)) {
    return CategoryType.FIX;
  }

  // Refactor / Perf -> 🚀
  if (/^(refactor|perf|optim|improve|cleanup|style|melhoria|otimiza)/.test(lowerMsg)) {
    return CategoryType.REFACTOR;
  }

  // Others -> 📝
  return CategoryType.MAINTENANCE;
};

export const analyzeCommits = (rawCommits: Commit[]): YearStats => {
  const categorizedCommits: CategorizedCommit[] = rawCommits.map(commit => ({
    ...commit,
    category: categorizeCommit(commit.message)
  }));

  const byCategory: Record<CategoryType, number> = {
    [CategoryType.FEATURE]: 0,
    [CategoryType.FIX]: 0,
    [CategoryType.REFACTOR]: 0,
    [CategoryType.MAINTENANCE]: 0,
  };

  const repoCounts: Record<string, number> = {};

  categorizedCommits.forEach(c => {
    byCategory[c.category]++;
    repoCounts[c.repo] = (repoCounts[c.repo] || 0) + 1;
  });

  const topRepos: RepoStat[] = Object.entries(repoCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCommits: rawCommits.length,
    byCategory,
    topRepos,
    categorizedCommits
  };
};

export const getCategoryEmoji = (cat: CategoryType): string => {
  switch (cat) {
    case CategoryType.FEATURE: return '✨';
    case CategoryType.FIX: return '🛠️';
    case CategoryType.REFACTOR: return '🚀';
    case CategoryType.MAINTENANCE: return '📝';
  }
};

export const getCategoryLabel = (cat: CategoryType): string => {
  switch (cat) {
    case CategoryType.FEATURE: return 'Implementações';
    case CategoryType.FIX: return 'Correções de Bugs';
    case CategoryType.REFACTOR: return 'Melhorias Técnicas';
    case CategoryType.MAINTENANCE: return 'Manutenção';
  }
};
