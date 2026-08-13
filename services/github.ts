import { GitHubApiCommitItem, SearchResponse } from '../types';

const BASE_URL = 'https://api.github.com';

export const fetchCommitsForPeriod = async (
  username: string,
  start: Date,
  end: Date,
  token?: string
): Promise<GitHubApiCommitItem[]> => {
  const headers: any = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const since = start.toISOString().split('T')[0];
  const until = end.toISOString().split('T')[0];

  const query = `author:${username} committer-date:${since}..${until} sort:committer-date-desc`;
  const encodedQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/search/commits?q=${encodedQuery}&per_page=100`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 403) throw new Error('Limite da API excedido. Forneça um Token.');
    throw new Error(`Erro API GitHub: ${response.statusText}`);
  }

  const data: SearchResponse = await response.json();
  return data.items || [];
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