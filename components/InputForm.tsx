
import React, { useState } from 'react';
import { Search, Github, Lock, Calendar, Cloud, User, Plus, Trash2, Link as LinkIcon, ChartNoAxesGantt, Loader2, LogIn, X } from 'lucide-react';
import { Provider } from '../types';

interface InputFormProps {
  onSubmit: (provider: Provider, identity: string, token: string, year: number, secondaryIdentity?: string, repoList?: string[]) => void;
  loading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, loading }) => {
  const [provider, setProvider] = useState<Provider>('azure'); // Default to Azure based on user preference
  const [primaryInput, setPrimaryInput] = useState(''); // GitHub Username

  // Load saved organizations and identities from localStorage
  const [savedIdentities, setSavedIdentities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devcenter_saved_identities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedOrgs, setSavedOrgs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devcenter_saved_orgs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orgName, setOrgName] = useState(() => {
    try {
      return localStorage.getItem('devcenter_last_org') || 'InfortechMS';
    } catch {
      return 'InfortechMS';
    }
  });

  const [secondaryInput, setSecondaryInput] = useState(() => {
    try {
      return localStorage.getItem('devcenter_last_identity') || '';
    } catch {
      return '';
    }
  });

  const [token, setToken] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const removeSavedIdentity = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedIdentities.filter(id => id !== idToRemove);
    setSavedIdentities(updated);
    try {
      localStorage.setItem('devcenter_saved_identities', JSON.stringify(updated));
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (provider === 'github') {
      if (primaryInput.trim()) {
        onSubmit(provider, primaryInput.trim(), token.trim(), year, undefined, undefined);
      }
    } else {
      // Azure
      if (orgName.trim() && secondaryInput.trim()) {
        const trimmedIdentity = secondaryInput.trim();
        const trimmedOrg = orgName.trim();

        try {
          localStorage.setItem('devcenter_last_identity', trimmedIdentity);
          localStorage.setItem('devcenter_last_org', trimmedOrg);

          const updatedIdentities = Array.from(new Set([trimmedIdentity, ...savedIdentities])).slice(0, 10);
          setSavedIdentities(updatedIdentities);
          localStorage.setItem('devcenter_saved_identities', JSON.stringify(updatedIdentities));

          const updatedOrgs = Array.from(new Set([trimmedOrg, ...savedOrgs])).slice(0, 10);
          setSavedOrgs(updatedOrgs);
          localStorage.setItem('devcenter_saved_orgs', JSON.stringify(updatedOrgs));
        } catch (err) {
          console.error('Erro ao salvar no localStorage:', err);
        }

        // Passamos o Nome da Organização como 'identity' (2º argumento) revisando a lógica no App.tsx
        onSubmit(provider, trimmedOrg, token.trim(), year, trimmedIdentity, []);
      }
    }
  };

  return (
    <div className="w-full max-w-lg bg-surface-muted rounded-md p-2 border-2 border-primary-dark animate-fade-in relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-10 -right-1/3 w-1/2 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-1/2 bg-primary/10 rounded-full blur-3xl"></div>

      <div className="text-center relative z-10">
        <div className="flex gap-2 align-center justify-center">
          <h1 className="text-5xl font-extrabold  tracking-tight self-center">
            Dev<span className="text-accent">Center</span>
          </h1>

          <div className={`rounded-md flex items-center justify-center transform transition-all duration-300`}>
            {provider === 'github' ? <Github size={32} className="" /> : <ChartNoAxesGantt size={48} className="" />}
          </div>
        </div>

        <p className="nt-light font-bold font-mono">
          Controle sua vida profissional
        </p>
      </div>

      <div className="flex p-1.5 bg-gray-950 rounded-md mb-8 relative z-10">
        <button
          type="button"
          onClick={() => setProvider('azure')}
          className={`
            flex-1 py-2.5 text-sm font-semibold rounded-md transition-all
            ${provider === 'azure' ? 'bg-gradient-to-r from-primary to-primary-dark' : ''} text-accent-light hover:brightness-125 hover:backdrop-brightness-125`}
        >
          Azure DevOps
        </button>
        <button
          type="button"
          onClick={() => setProvider('github')}
          disabled={true}
          className={`${provider === 'github' ? 'bg-primary-dark' : ''} cursor-not-allowed flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
             text-accent-light hover:brightness-125 hover:backdrop-brightness-125`}
        >
          GitHub
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">

        {provider === 'github' ? (
          <div className="space-y-2">
            <label htmlFor="primary" className="text-xs font-bold uppercase tracking-wider text-accent-light ml-1">
              Usuário do GitHub
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent-light group-focus-within:text-accent transition-colors" size={20} />
              <input
                id="primary"
                type="text"
                value={primaryInput}
                onChange={(e) => setPrimaryInput(e.target.value)}
                placeholder="ex: torvalds"
                className="w-full pl-12 pr-4 py-4 bg-gray-950 border border-gray-800 text-accent-light rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder-accent-light/70"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="orgName" className="text-xs font-bold uppercase tracking-wider text-accent-light ml-1">
                Nome da Organização (Azure DevOps)
              </label>
              <div className="relative group">
                <Cloud className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent-light group-focus-within:text-accent transition-colors" size={20} />
                <input
                  id="orgName"
                  type="text"
                  list="org-suggestions"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: MinhaOrganizacao"
                  className="w-full !pl-10"
                />
                <datalist id="org-suggestions">
                  {savedOrgs.map((org, idx) => (
                    <option key={idx} value={org} />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-pretty text-accent-light/75">O sistema irá buscar o trabalho em <strong className='text-accent-light'>todos</strong> os projetos e repositórios desta organização.</p>
            </div>

            <div className="space-y-2 animate-fade-in">
              <label htmlFor="secondary" className="text-xs font-bold uppercase tracking-wider text-accent-light ml-1">
                Seus Nomes / E-mails (Separados por vírgula)
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent-light group-focus-within:text-accent transition-colors" size={20} />
                <input
                  id="secondary"
                  type="text"
                  list="identity-suggestions"
                  value={secondaryInput}
                  onChange={(e) => setSecondaryInput(e.target.value)}
                  placeholder="Ex: seu.nome, email@empresa.com"
                  required
                  className="w-full !pl-10"
                />
                <datalist id="identity-suggestions">
                  {savedIdentities.map((id, index) => (
                    <option key={index} value={id} />
                  ))}
                </datalist>
              </div>

              {savedIdentities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-accent-light/60">Salvos:</span>
                  {savedIdentities.map((id, idx) => (
                    <span
                      key={idx}
                      onClick={() => setSecondaryInput(id)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                        secondaryInput === id
                          ? 'bg-accent/25 border-accent text-accent-light font-medium shadow-sm'
                          : 'bg-gray-900/90 border-gray-800 text-accent-light/80 hover:border-accent/50 hover:text-accent-light'
                      }`}
                      title="Clique para selecionar"
                    >
                      <span>{id}</span>
                      <button
                        type="button"
                        onClick={(e) => removeSavedIdentity(id, e)}
                        className="hover:text-red-400 text-accent-light/50 p-0.5 rounded-full hover:bg-gray-800 transition-colors"
                        title="Remover do histórico"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-accent-light/75 text-pretty">Use vírgulas se você comita com identidades diferentes (pessoal/corporativo).</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="year" className="text-xs font-bold uppercase tracking-wider text-accent-light ml-1">Ano Base</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent-light group-focus-within:text-accent transition-colors" size={20} />
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full !pl-10"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <option key={i} value={currentYear - i} className="bg-gray-900">{currentYear - i}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="token" className="text-xs font-bold uppercase tracking-wider text-accent-light ml-1">
              Token <span className="text-accent uppercase font-bold text-xs font-mono">({provider === 'azure' ? 'Obrigatório' : 'Opcional'})</span>
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-accent-light group-focus-within:text-accent transition-colors" size={20} />
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required={provider === 'azure'}
                placeholder={provider === 'github' ? "ghp_..." : "Personal Access Token"}
                className={`w-full !pl-10 ${provider === 'azure' ? 'focus:ring-accent/50 focus:border-accent' : 'focus:ring-gray-700 focus:border-accent-light/70'}`}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-4 px-6 text-accent-light
             font-bold rounded-md transition-all 
             active:scale-[0.98] flex justify-center items-center text-lg 
             ${loading ? 'opacity-70 cursor-not-allowed' : ''} 
             ${provider === 'github' ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-hover hover:to-primary-dark'}`}
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-light" />
              Carregando...
            </span>
          ) : (
            <span className="flex items-center">
              <LogIn className="mr-2 h-5 w-5" />
              Entrar
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default InputForm;
