import OpenAI from 'openai';

interface DeepSeekConfig {
    apiKey: string;
    baseURL?: string; // Optional, defaults to DeepSeek's if not provided, but good for flexibility
}

export const createDeepSeekClient = (apiKey: string) => {
    return new OpenAI({
        apiKey: apiKey,
        baseURL: '/deepseek-api/v1', // Use proxy to bypass CORS
        dangerouslyAllowBrowser: true // Enabling for client-side usage as per context
    });
};
