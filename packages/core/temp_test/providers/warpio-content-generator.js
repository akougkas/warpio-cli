/**
 * Warpio Content Generator - Pure Vercel AI SDK Implementation
 *
 * This replaces the ContentGenerator bridge with direct AI SDK usage
 * for the standalone Warpio system. No compatibility layers needed.
 */
import { generateText, streamText } from 'ai';
import { getLanguageModel, parseProviderConfig } from './registry.js';
/**
 * Warpio Content Generator - Modern AI SDK Implementation
 */
export class WarpioContentGenerator {
    model;
    constructor(providerConfig) {
        const config = { ...parseProviderConfig(), ...providerConfig };
        this.model = getLanguageModel(config);
    }
    async generate(params) {
        const result = await generateText({
            model: this.model,
            messages: params.messages,
            tools: params.tools,
            system: params.system,
            temperature: params.temperature,
        });
        const usage = await result.usage;
        return {
            text: result.text,
            usage: {
                promptTokens: usage.promptTokens || 0,
                completionTokens: usage.completionTokens || 0,
                totalTokens: usage.totalTokens || 0,
            },
            toolCalls: result.toolCalls,
        };
    }
    async *stream(params) {
        const result = streamText({
            model: this.model,
            messages: params.messages,
            tools: params.tools,
            system: params.system,
            temperature: params.temperature,
        });
        let fullText = '';
        for await (const textPart of result.textStream) {
            fullText += textPart;
            yield { text: fullText, delta: textPart };
        }
    }
    /**
     * Get the underlying AI SDK model for direct usage
     */
    getModel() {
        return this.model;
    }
    /**
     * Check if the provider is available
     */
    async isAvailable() {
        try {
            const result = await generateText({
                model: this.model,
                prompt: 'test',
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
/**
 * Factory function for creating Warpio content generators
 */
export function createWarpioContentGenerator(providerConfig) {
    return new WarpioContentGenerator(providerConfig);
}
/**
 * Utility function to convert various formats to CoreMessage format
 */
export function convertToMessages(contents) {
    if (!contents)
        return [];
    // If it's already in the right format
    if (Array.isArray(contents) && contents[0]?.role && contents[0]?.content) {
        return contents;
    }
    // Convert from Gemini format if needed
    if (Array.isArray(contents)) {
        return contents.map(content => ({
            role: content.role === 'user' ? 'user' : 'assistant',
            content: content.parts?.map((part) => {
                if ('text' in part)
                    return part.text;
                if ('functionCall' in part)
                    return `[Function Call: ${part.functionCall.name}]`;
                if ('functionResponse' in part)
                    return `[Function Response: ${JSON.stringify(part.functionResponse)}]`;
                return '';
            }).join('\n') || content.content || String(content)
        }));
    }
    // Handle single string
    if (typeof contents === 'string') {
        return [{ role: 'user', content: contents }];
    }
    return [];
}
