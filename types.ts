
export interface Commit {
  sha: string;
  message: string;
  fullMessage: string; // Mensagem completa incluindo corpo
  body?: string; // Corpo da mensagem (descrição detalhada) sem o título
  date: string;
  repo: string;
  url: string;
  scope?: string; // Contexto inferido (ex: 'auth', 'header', 'login')
  branch?: string; // Nome real da branch (ex: Sprint_33)
  context?: string; // Título do PR ou contexto maior de negócio
  taskInfo?: {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    sprint: string;
    url: string;
    type: string;
    parent?: {
      id: string;
      title: string;
      type: string;
    };
  };
}

export enum CategoryType {
  FEATURE = 'FEATURE',
  FIX = 'FIX',
  REFACTOR = 'REFACTOR',
  MAINTENANCE = 'MAINTENANCE',
}

export interface CategorizedCommit extends Commit {
  category: CategoryType;
}

export interface RepoStat {
  name: string;
  count: number;
}

export interface YearStats {
  totalCommits: number;
  byCategory: Record<CategoryType, number>;
  topRepos: RepoStat[];
  categorizedCommits: CategorizedCommit[];
}

export interface GitHubApiCommitItem {
  sha: string;
  commit: {
    message: string;
    committer: {
      date: string;
    };
  };
  repository: {
    name: string;
  };
  html_url: string;
}

export interface AzureApiCommitItem {
  commitId: string;
  comment: string;
  author: {
    date: string;
    name: string;
    email?: string;
  };
  remoteUrl: string;
  branch?: string; // Branch obtida via Push API ou PR
  context?: string; // Título do PR associado
  taskInfo?: {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    sprint: string;
    url: string;
    type: string;
    parent?: {
      id: string;
      title: string;
      type: string;
    };
  };
}

export interface AzureWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.CreatedBy': { displayName: string };
    'System.IterationPath': string;
    'System.WorkItemType': string;
  };
  _links: {
    html: { href: string };
  };
}

export interface AzureProject {
  id: string;
  name: string;
  url: string;
}

export interface AzureRepository {
  id: string;
  name: string;
  url: string;
  project: {
    id: string;
    name: string;
  };
}

export interface UserIdentityConfig {
  devOpsUserId?: string;      // O UUID do Azure (opcional se não tiver input)
  gitAuthorEmails: string[]; // Lista de emails que você usa nos commits (pessoal e trabalho)
  gitAuthorNames: string[];  // Lista de nomes (ex: "Pedro", "Pedro Almeida")
}

export interface SearchResponse {
  total_count: number;
  items: GitHubApiCommitItem[];
}

export type Provider = 'github' | 'azure';

export type SeniorityLevel = 'Intern' | 'Junior' | 'Mid-Level' | 'Senior';
export type RoleType = 'Frontend' | 'Backend' | 'Fullstack';

export interface UserContext {
  seniority: SeniorityLevel;
  role: RoleType;
  isHRMode?: boolean; // Se true, o 'Role' pode ser ignorado ou usado apenas para contexto tecnico
}

export interface CommitFileChange {
  fileName: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'edit';
  additions?: number;
  deletions?: number;
  url?: string;
}
