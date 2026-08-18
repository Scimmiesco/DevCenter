import React from 'react';
import { AIConfig, AIProvider } from '../types';
import { Key, Bot, Save } from 'lucide-react';

interface AiConfigTabProps {
  aiConfig: AIConfig;
  setAiConfig: (config: AIConfig) => void;
}

export const AiConfigTab: React.FC<AiConfigTabProps> = ({ aiConfig, setAiConfig }) => {
  const [localConfig, setLocalConfig] = React.useState<AIConfig>(aiConfig);
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    setAiConfig(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto p-6 bg-surface rounded-xl border border-primary-dark">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-600/20 text-orange-500 rounded-lg">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-accent-light">Configuração de IA</h2>
          <p className="text-sm text-accent-light/70">Escolha o modelo e insira sua chave de API</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-accent-light mb-2">Provedor de IA</label>
          <select
            value={localConfig.provider}
            onChange={(e) => setLocalConfig({ ...localConfig, provider: e.target.value as AIProvider })}
            className="w-full bg-surface-muted text-accent-light border border-primary-dark rounded-md p-3 focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="deepseek">DeepSeek (Recomendado)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-accent-light mb-2 flex items-center gap-2">
            <Key size={16} /> API Key
          </label>
          <input
            type="password"
            value={localConfig.apiKey}
            onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
            placeholder={`Insira sua chave do ${localConfig.provider === 'gemini' ? 'Gemini' : 'DeepSeek'} aqui...`}
            className="w-full bg-surface-muted text-accent-light border border-primary-dark rounded-md p-3 focus:outline-none focus:border-orange-500 transition-colors font-mono"
          />
          <p className="text-xs text-accent-light/50 mt-2">
            Sua chave é salva apenas localmente no seu navegador e enviada diretamente para a API.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
          disabled={!localConfig.apiKey}
        >
          <Save size={18} />
          {saved ? 'Salvo com sucesso!' : 'Salvar Configuração'}
        </button>
      </div>
    </div>
  );
};
