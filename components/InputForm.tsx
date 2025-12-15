
import React, { useState } from 'react';
import { Search, Github, Lock, Calendar, Cloud, User, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { Provider } from '../types';

interface InputFormProps {
  onSubmit: (provider: Provider, identity: string, token: string, year: number, secondaryIdentity?: string, repoList?: string[]) => void;
  loading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, loading }) => {
  const [provider, setProvider] = useState<Provider>('azure'); // Default to Azure based on user preference
  const [primaryInput, setPrimaryInput] = useState(''); // GitHub Username

  const [orgName, setOrgName] = useState('InfortechMS'); // Default Organization
  // Nome do autor pré-selecionado (Exemplo com múltiplos aliases)
  const [secondaryInput, setSecondaryInput] = useState('Scimmiesco, pedro.almeida');

  const [token, setToken] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (provider === 'github') {
      if (primaryInput.trim()) {
        onSubmit(provider, primaryInput.trim(), token.trim(), year, undefined, undefined);
      }
    } else {
      // Azure
      if (orgName.trim() && secondaryInput.trim()) {
        // Passamos o Nome da Organização como 'identity' (2º argumento) revisando a lógica no App.tsx
        onSubmit(provider, orgName.trim(), token.trim(), year, secondaryInput.trim(), []);
      }
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800 animate-fade-in relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>

      <div className="text-center mb-8 relative z-10">
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-900/20 transform transition-all duration-300 ${provider === 'github' ? 'bg-slate-950 border border-slate-800' : 'bg-blue-600 shadow-blue-600/40'}`}>
          {provider === 'github' ? <Github size={32} className="text-white" /> : <Cloud size={32} className="text-white" />}
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          Dev<span className="text-orange-500">Center</span>
        </h1>
        <p className="text-slate-400 font-medium">
          {provider === 'github' ? 'Retrospectiva Open Source' : 'Gestão de Entregas Corporativas'}
        </p>
      </div>

      <div className="flex p-1.5 bg-slate-950 border border-slate-800 rounded-xl mb-8 relative z-10">
        <button
          type="button"
          onClick={() => setProvider('azure')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${provider === 'azure' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
        >
          Azure DevOps
        </button>
        <button
          type="button"
          onClick={() => setProvider('github')}
          disabled={true}
          className={`cursor-not-allowed flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${provider === 'github' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
        >
          GitHub
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">

        {provider === 'github' ? (
          <div className="space-y-2">
            <label htmlFor="primary" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Usuário do GitHub
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                id="primary"
                type="text"
                value={primaryInput}
                onChange={(e) => setPrimaryInput(e.target.value)}
                placeholder="ex: torvalds"
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder-slate-600"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="orgName" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Nome da Organização (Azure DevOps)
              </label>
              <div className="relative group">
                <Cloud className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: InfortechMS"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder-slate-600"
                />
              </div>
              <p className="text-xs text-slate-500 ml-1">O sistema irá buscar o trabalho em <strong>todos</strong> os projetos e repositórios desta organização.</p>
            </div>

            <div className="space-y-2 animate-fade-in">
              <label htmlFor="secondary" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                Seus Nomes / E-mails (Separados por vírgula)
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  id="secondary"
                  type="text"
                  value={secondaryInput}
                  onChange={(e) => setSecondaryInput(e.target.value)}
                  placeholder="Ex: Scimmiesco, pedro.almeida"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder-slate-600"
                />
              </div>
              <p className="text-[10px] text-slate-600 ml-1">Use vírgulas se você comita com identidades diferentes (pessoal/corporativo).</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="year" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Ano Base</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-blue-600 appearance-none bg-none"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <option key={i} value={currentYear - i} className="bg-slate-900">{currentYear - i}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="token" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Token <span className="text-slate-600 font-normal">({provider === 'azure' ? 'Obrigatório' : 'Opcional'})</span>
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required={provider === 'azure'}
                placeholder={provider === 'github' ? "ghp_..." : "Personal Access Token"}
                className={`w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 transition-all placeholder-slate-600 ${provider === 'azure' ? 'focus:ring-blue-600/50 focus:border-blue-600' : 'focus:ring-slate-700 focus:border-slate-500'}`}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex justify-center items-center text-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''} ${provider === 'github' ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30'}`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisando Projetos...
            </span>
          ) : (
            'Gerar Relatório Profissional'
          )}
        </button>
      </form>
    </div>
  );
};

export default InputForm;
