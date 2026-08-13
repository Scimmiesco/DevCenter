
import React, { useState } from 'react';
import InputForm from './components/InputForm';
import Dashboard from './components/Dashboard';
import { YearStats, Provider, GitHubApiCommitItem, AzureApiCommitItem, UserContext, AzureRepository, AIConfig } from './types';
import { fetchCommitsForPeriod } from './services/github';
import { fetchAzureCommits, discoverRepositories, fetchCommitsForRepos } from './services/azure';
import { parseCommits, analyzeCommits } from './utils/analyzer';
import { RepositorySelector } from './components/RepositorySelector';
import { DateRangeSelector, DateRange } from './components/DateRangeSelector';
import ThemeSelector from './components/ThemeSelector';
import { Folder } from 'lucide-react';

const App: React.FC = () => {
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState(''); // Username (GH) or Author Name (Azure)

  // Default to 2 Weeks
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 14);
    return { label: '2 Semanas', start, end };
  });

  const [currentProvider, setCurrentProvider] = useState<Provider>('github');
  const [currentToken, setCurrentToken] = useState<string | undefined>(undefined);
  const [userContext, setUserContext] = useState<UserContext>({
    seniority: 'Mid-Level',
    role: 'Fullstack',
    isHRMode: false
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('aiConfig');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      provider: 'deepseek',
      apiKey: (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || ''
    };
  });

  React.useEffect(() => {
    localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
  }, [aiConfig]);

  // --- AZURE CONTEXT STATE ---
  const [availableRepos, setAvailableRepos] = useState<AzureRepository[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [azureConfig, setAzureConfig] = useState<{ org: string; aliases: string[]; token: string } | null>(null);
  /* --- STATE: CONNECTION --- */
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // --- INCREMENTAL CACHE STATE ---
  const [cachedCommits, setCachedCommits] = useState<(GitHubApiCommitItem | AzureApiCommitItem)[]>([]);
  const [cacheRange, setCacheRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  const processCommits = (rawItems: (GitHubApiCommitItem | AzureApiCommitItem)[]) => {
    // 1. Merge new items with cache, removing duplicates by ID/SHA
    const combined = [...cachedCommits, ...rawItems];
    const uniqueMap = new Map();
    combined.forEach(c => {
      const key = (c as any).sha || (c as any).commitId; // Support both GH and Azure
      if (key) uniqueMap.set(key, c);
    });
    const uniqueCommits = Array.from(uniqueMap.values());

    // 2. Update Cache
    setCachedCommits(uniqueCommits);
    return uniqueCommits;
  };

  const updateStatsFromCache = (commits: any[], range: DateRange) => {
    // Filter commits within the requested range
    const inRange = commits.filter((c: any) => {
      const d = new Date(c.date || c.committer?.date || (c.author && c.author.date));
      return d >= range.start && d <= range.end;
    });

    console.log(`📊 [Analyzer] Filtering: ${inRange.length} commits in range out of ${commits.length} cached.`);

    const parsed = parseCommits(inRange);
    const analysis = analyzeCommits(parsed);
    setStats(analysis);
  };

  const smartFetch = async (newRange: DateRange, provider: Provider, token: string, identity: string, org?: string, repos?: AzureRepository[], aliases?: string[]) => {
    let itemsToFetch: any[] = [];
    let newCacheStart = cacheRange.start;
    let newCacheEnd = cacheRange.end;

    // Logic: Determining what to fetch
    // If no cache, fetch full range.
    // If new start < cache start, fetch [newStart, cacheStart].
    // If new end > cache end, fetch [cacheEnd, newEnd].

    const fetchQueue = [];

    if (!cacheRange.start || !cacheRange.end) {
      // First fetch
      fetchQueue.push({ start: newRange.start, end: newRange.end });
      newCacheStart = newRange.start;
      newCacheEnd = newRange.end;
    } else {
      // Check Start Gap
      if (newRange.start < cacheRange.start) {
        console.log(`⚡ [Incremental] Fetching previous gap: ${newRange.start.toLocaleDateString()} -> ${cacheRange.start.toLocaleDateString()}`);
        fetchQueue.push({ start: newRange.start, end: cacheRange.start });
        newCacheStart = newRange.start;
      }
      // Check End Gap
      if (newRange.end > cacheRange.end) {
        console.log(`⚡ [Incremental] Fetching newer gap: ${cacheRange.end.toLocaleDateString()} -> ${newRange.end.toLocaleDateString()}`);
        fetchQueue.push({ start: cacheRange.end, end: newRange.end });
        newCacheEnd = newRange.end;
      }
    }

    if (fetchQueue.length > 0) {
      setLoading(true);
      try {
        for (const q of fetchQueue) {
          let rawIds = [];
          if (provider === 'github') {
            rawIds = await fetchCommitsForPeriod(identity, q.start, q.end, token);
          } else if (org && repos && aliases) {
            rawIds = await fetchCommitsForRepos(org, repos, aliases, q.start, q.end, token);
          }
          itemsToFetch = [...itemsToFetch, ...rawIds];
        }

        const updatedCache = processCommits(itemsToFetch);
        setCacheRange({ start: newCacheStart, end: newCacheEnd });
        updateStatsFromCache(updatedCache, newRange);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Everything needed is in cache, just re-calc stats
      console.log(`⚡ [Incremental] Cache hit! No new fetch needed.`);
      updateStatsFromCache(cachedCommits, newRange);
    }
  };

  const handleFetch = async (
    provider: Provider,
    primaryInput: string,
    token: string,
    selectedYear: number,
    secondaryInput?: string,
    repoList?: string[]
  ) => {
    // Reset Cache on new Login/Connection
    setCachedCommits([]);
    setCacheRange({ start: null, end: null });

    setLoading(true);
    setError(null);
    setCurrentProvider(provider);
    setCurrentToken(token);

    try {
      if (provider === 'github') {
        setIdentity(primaryInput);
        // Direct Smart Fetch for GitHub
        await smartFetch(dateRange, 'github', token, primaryInput);
        setIsConnected(true);
      } else {
        // Azure Discovery... (No fetch yet)
        if (!secondaryInput) throw new Error("Nome do autor é obrigatório para Azure DevOps.");
        const orgName = primaryInput;
        setIdentity(secondaryInput.split(',').join(' / '));
        setAzureConfig({ org: orgName, aliases: secondaryInput.split(','), token });

        setIsDiscovering(true);
        const repos = await discoverRepositories(orgName, token);
        setAvailableRepos(repos);
        setIsConnected(true);
        setIsDiscovering(false);
        setLoading(false); // Stop loading, waiting for Repo Selection
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Triggered when Azure Repos are confirmed OR when DateRange changes (via effect/wrapper)
  const handleContextConfirm = async () => {
    if (!azureConfig || selectedRepoIds.length === 0) return;
    const selectedRepos = availableRepos.filter(r => selectedRepoIds.includes(r.id));
    await smartFetch(dateRange, 'azure', azureConfig.token, identity, azureConfig.org, selectedRepos, azureConfig.aliases);
  };

  const handleDateChange = async (r: DateRange) => {
    setDateRange(r);
    // Trigger Smart Fetch immediately
    if (isConnected) {
      if (currentProvider === 'github') {
        await smartFetch(r, 'github', currentToken!, identity);
      } else if (azureConfig && selectedRepoIds.length > 0) {
        const selectedRepos = availableRepos.filter(repo => selectedRepoIds.includes(repo.id));
        await smartFetch(r, 'azure', azureConfig!.token, identity, azureConfig!.org, selectedRepos, azureConfig!.aliases);
      }
    }
  };



  const handleReset = () => {
    setStats(null);
    setError(null);
    setIsConnected(false);
    setAvailableRepos([]);
    setSelectedRepoIds([]);
    setAzureConfig(null);
    // Reset Cache
    setCachedCommits([]);
    setCacheRange({ start: null, end: null });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-2 bg-surface font-inter">
      {error && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 text-red-600 px-6 py-4 rounded-lg shadow-lg border border-red-100 flex items-center w-full max-w-lg">
          <span className="font-semibold mr-2 shrink-0">Erro:</span>
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto pl-4 text-red-400 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {!isConnected ? (
        <div className="w-full max-w-md space-y-4 m-auto">
          <InputForm onSubmit={handleFetch} loading={loading} />
        </div>
      ) : (
        <div className="w-full max-w-6xl">
          <div className="w-full py-4 space-y-4">
            {/* Header Controls */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleReset}
                className="p-2 flex items-center gap-2 text-accent-light hover:text-accent-light 
                transition-colors font-bold text-xs rounded-md hover:bg-emerald-950"
              >
                &larr; Nova Conexão
              </button>
              <ThemeSelector />
            </div>

            {/* GLOBAL CONFIGURATION BAR: Date & Repo Context */}
            <div className="border-2 bg-surface-muted border-primary-dark rounded-md p-2 flex flex-col 
            md:flex-row gap-4 items-start md:items-center animate-in slide-in-from-top-4">
              <div className="flex-1">
                <DateRangeSelector currentRange={dateRange} onRangeChange={handleDateChange} disabled={loading} />
              </div>

              {/* Information / Status */}
              {currentProvider === 'azure' && (
                <div className="text-right hidden md:block">
                  <div className="text-xs text-accent-light font-bold uppercase">Organização</div>
                  <div className="text-md font-bold text-accent">{azureConfig?.org}</div>
                </div>
              )}
            </div>

            {/* Repository Selector for Azure */}
            {currentProvider === 'azure' && (
              <div className="border-2 bg-surface-muted border-primary-dark rounded-md p-2 flex flex-col 
            md:flex-row gap-4 items-start md:items-center animate-in slide-in-from-top-4">
                <RepositorySelector
                  repositories={availableRepos}
                  selectedRepoIds={selectedRepoIds}
                  onSelectionChange={setSelectedRepoIds}
                  onConfirm={handleContextConfirm}
                  isLoading={loading}
                />
              </div>
            )}
          </div>


          {stats && (
            <Dashboard
              username={identity}
              dateRange={dateRange}
              stats={stats}
              onReset={handleReset}
              provider={currentProvider}
              token={currentToken}
              userContext={userContext}
              setUserContext={setUserContext}
              azureConfig={azureConfig}
              selectedRepos={availableRepos.filter(r => selectedRepoIds.includes(r.id))}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
            />
          )}

          {/* Empty State / Welcome for Dashboard when connected but no stats yet */}
          {!stats && currentProvider === 'azure' && (
            <div className="container-padrao flex !flex-col">
              <div className="flex items-center justify-center mx-auto text-accent">
                <Folder size={40} />
              </div>
              <h2 className="text-2xl font-bold text-accent-light">Conectado à {azureConfig?.org}</h2>
              <p className="text-accent-light text-pretty max-w-full mx-auto">
                Selecione os repositórios acima e defina o período de análise.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default App;
