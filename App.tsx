
import React, { useState } from 'react';
import InputForm from './components/InputForm';
import Dashboard from './components/Dashboard';
import { YearStats, Provider, GitHubApiCommitItem, AzureApiCommitItem, UserContext } from './types';
import { fetchCommitsForYear } from './services/github';
import { fetchAzureCommits, fetchAllOrganizationCommits } from './services/azure';
import { parseCommits, analyzeCommits } from './utils/analyzer';
import ContextSelector from './components/ContextSelector';

const App: React.FC = () => {
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState(''); // Username (GH) or Author Name (Azure)
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentProvider, setCurrentProvider] = useState<Provider>('github');
  const [currentToken, setCurrentToken] = useState<string | undefined>(undefined);
  const [userContext, setUserContext] = useState<UserContext>({
    seniority: 'Mid-Level',
    role: 'Fullstack',
    isHRMode: false
  });

  const handleFetch = async (
    provider: Provider,
    primaryInput: string,
    token: string,
    selectedYear: number,
    secondaryInput?: string,
    repoList?: string[]
  ) => {
    setLoading(true);
    setError(null);
    setYear(selectedYear);
    setCurrentProvider(provider);
    setCurrentToken(token);

    console.group('🚀 [App] Iniciando Busca');
    console.log(`📡 Provider: ${provider}`);
    console.log(`📅 Ano: ${selectedYear}`);
    console.log(`👤 Identidade Principal: ${primaryInput}`);

    try {
      let rawItems: (GitHubApiCommitItem | AzureApiCommitItem)[] = [];

      if (provider === 'github') {
        setIdentity(primaryInput);
        console.log('🔄 Chamando Service GitHub...');
        rawItems = await fetchCommitsForYear(primaryInput, selectedYear, token);
        console.log(`✅ [App] Retorno GitHub (Full Array):`, rawItems);
      } else {
        // Azure DevOps
        if (!secondaryInput) throw new Error("Nome do autor é obrigatório para Azure DevOps.");
        // primaryInput agora é o Nome da Organização
        const orgName = primaryInput;
        if (!orgName) throw new Error("Nome da Organização é obrigatório.");

        // Separa os nomes/aliases por vírgula para tratar múltiplas identidades
        const aliases = secondaryInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
        console.log(`👥 Aliases Azure:`, aliases);
        console.log(`🏢 Organização Azure:`, orgName);

        // Para exibição, mostramos o primeiro alias ou todos se couberem
        setIdentity(aliases.join(' / '));

        console.time('⏱️ Tempo Azure Global Fetch');
        // Usamos a nova estratégia Global (Org -> Projects -> Repos -> Commits)
        // O token é obrigatório aqui
        if (!token) throw new Error("Token é obrigatório para Azure DevOps.");

        const azureCommits = await fetchAllOrganizationCommits(orgName, aliases, selectedYear, token);
        console.timeEnd('⏱️ Tempo Azure Global Fetch');

        if (azureCommits.length === 0) {
          throw new Error(`Nenhum commit encontrado em ${selectedYear} na organização ${orgName}. Verifique seu nome/aliases e permissões.`);
        }

        rawItems = azureCommits;
      }

      if (rawItems.length === 0) {
        throw new Error(`Nenhum commit encontrado em ${selectedYear}.`);
      }

      console.log('🛠️ [App] Iniciando Análise/Normalização...');
      const commits = parseCommits(rawItems);
      const analysis = analyzeCommits(commits);
      console.log('📈 [App] Estatísticas Geradas:', analysis);

      setStats(analysis);
      console.groupEnd();
    } catch (err: any) {
      console.error('❌ [App] Erro Fatal:', err);
      console.groupEnd();
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStats(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 pt-0 bg-slate-900 font-inter">
      {error && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 text-red-600 px-6 py-4 rounded-lg shadow-lg border border-red-100 flex items-center w-full max-w-lg">
          <span className="font-semibold mr-2 shrink-0">Erro:</span>
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto pl-4 text-red-400 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {!stats ? (
        <InputForm onSubmit={handleFetch} loading={loading} />
      ) : (
        <div className="w-full max-w-6xl">
          <div className="">
            <button
              onClick={handleReset}
              className="p-2 flex items-center gap-2 text-slate-300 hover:text-slate-400 transition-colors font-bold text-xs"
            >
              &larr; Nova Busca
            </button>


          </div>

          <Dashboard
            username={identity}
            year={year}
            stats={stats}
            onReset={handleReset}
            provider={currentProvider}
            token={currentToken}
            userContext={userContext}
            setUserContext={setUserContext}
          />
        </div>
      )}

      {!stats && (
        <footer className="fixed bottom-4 text-slate-400 text-xs text-center w-full px-4">
          Feito para Desenvolvedores de Alta Performance
        </footer>
      )}
    </div>
  );
};

export default App;
