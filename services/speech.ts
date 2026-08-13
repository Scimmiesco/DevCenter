import { AIConfig } from '../types';

export interface SpeechResponse {
    content: string;
    reasoning?: string;
}

export const generateSpeechWithAI = async (prompt: string, aiConfig: AIConfig, signal?: AbortSignal): Promise<SpeechResponse> => {
    const apiKey = aiConfig.apiKey;

    if (!apiKey) throw new Error("API Key não configurada na aba de Configurações de IA.");

    try {
        if (aiConfig.provider === 'gemini') {
            const response = await fetch(`/gemini-api/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;

            return {
                content,
                reasoning: undefined
            };
        } else {
            const response = await fetch('/deepseek-api/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    stream: false
                }),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DeepSeek API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const message = data.choices[0].message;

            return {
                content: message.content,
                reasoning: message.reasoning_content
            };
        }
    } catch (e: any) {
        console.error("AI Request Failed:", e);
        throw new Error("Erro na IA: " + e.message);
    }
};
