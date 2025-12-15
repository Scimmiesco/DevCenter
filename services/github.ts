import { GitHubApiCommitItem, SearchResponse } from '../types';

const BASE_URL = 'https://api.github.com';

export const fetchCommitsForYear = async (
  username: string,
  year: number,
  token?: string
): Promise<GitHubApiCommitItem[]> => {
  // We use the Search API to find commits by the user in the given date range.
  // Note: Unauthenticated search is rate-limited (10 requests/min).
  // Authenticated is 30/min.

  const query = `author:${username} committer-date:${year}-01-01..${year}-12-31 sort:committer-date-desc`;
  const encodedQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/search/commits?q=${encodedQuery}&per_page=100`;
  console.log(`🔍 [GitHub Service] URL de Busca: ${url}`);

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  console.log('📤 [GitHub Service] Headers:', headers);

  const response = await fetch(url, { headers });
  console.log(`📬 [GitHub Service] Status Response:`, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Limite da API excedido. Por favor, forneça um Token de Acesso Pessoal (Personal Access Token).');
    }
    if (response.status === 422) {
      throw new Error('Falha na validação. Verifique se o nome de usuário está correto.');
    }
    throw new Error(`Erro na API do GitHub: ${response.statusText}`);
  }

  const data: SearchResponse = await response.json();
  console.log(`📦 [GitHub Service] Payload Recebido (First 1 item):`, data.items[0]);
  console.log(`📦 [GitHub Service] Payload Full Summary:`, {
    total_count: data.total_count,
    items_length: data.items.length
  });
  return data.items;
};

export const fetchGitHubCommit = async (
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<any> => {
  const url = `${BASE_URL}/repos/${owner}/${repo}/commits/${sha}`;
  console.log(`🔍 [GitHub Service] Fetch Single Commit URL: ${url}`);

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  console.log(`📬 [GitHub Service] Single Commit Status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Erro ao buscar detalhes do commit: ${response.statusText}`);
  }

  const data = await response.json();

  // Map GitHub 'files' to 'changes' structure
  const changes = data.files ? data.files.map((f: any) => ({
    fileName: f.filename,
    status: f.status, // added, modified, removed
    additions: f.additions,
    deletions: f.deletions,
    url: f.blob_url
  })) : [];

  const fullData = { ...data, changes };
  console.log(`📦 [GitHub Service] Single Commit Data (with ${changes.length} changes):`, fullData);
  return fullData;
};