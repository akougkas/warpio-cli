/**
 * Warpio Persona Registry - Standalone System
 * Clean separation from Gemini CLI core
 */
import { getBuiltInPersonas } from './personas/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'node:os';
export class WarpioPersonaRegistry {
    static instance;
    personas = new Map();
    hooks = {};
    searchPaths = [];
    constructor() {
        this.initializeDefaults();
    }
    static getInstance() {
        if (!WarpioPersonaRegistry.instance) {
            WarpioPersonaRegistry.instance = new WarpioPersonaRegistry();
        }
        return WarpioPersonaRegistry.instance;
    }
    initializeDefaults() {
        // Load built-in personas
        const builtInPersonas = getBuiltInPersonas();
        for (const persona of builtInPersonas) {
            this.personas.set(persona.name, persona);
        }
        // Set default search paths
        this.searchPaths = [
            path.join(process.cwd(), '.warpio', 'personas'),
            path.join(homedir(), '.warpio', 'personas'),
        ];
    }
    registerPersona(persona) {
        this.personas.set(persona.name, persona);
    }
    getPersona(name) {
        // Check registered personas first
        if (this.personas.has(name)) {
            return this.personas.get(name);
        }
        // Try loading from filesystem
        const loadedPersona = this.loadPersonaFromFs(name);
        if (loadedPersona) {
            this.personas.set(name, loadedPersona);
            return loadedPersona;
        }
        return null;
    }
    listPersonas() {
        const personaNames = new Set(this.personas.keys());
        // Add personas from filesystem
        for (const searchPath of this.searchPaths) {
            if (fs.existsSync(searchPath)) {
                const files = fs.readdirSync(searchPath);
                for (const file of files) {
                    if (file.endsWith('.md')) {
                        personaNames.add(path.basename(file, '.md'));
                    }
                }
            }
        }
        return Array.from(personaNames).sort();
    }
    setHooks(hooks) {
        this.hooks = { ...this.hooks, ...hooks };
    }
    getHooks() {
        return this.hooks;
    }
    loadPersonaFromFs(name) {
        for (const searchPath of this.searchPaths) {
            const personaPath = path.join(searchPath, `${name}.md`);
            if (fs.existsSync(personaPath)) {
                return this.parsePersonaFile(personaPath);
            }
        }
        return null;
    }
    parsePersonaFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
            if (!match)
                return null;
            const [, frontmatter, systemPrompt] = match;
            const metadata = {};
            frontmatter.split('\n').forEach((line) => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    if (key.trim() === 'tools') {
                        metadata[key.trim()] = value.split(',').map((t) => t.trim());
                    }
                    else {
                        metadata[key.trim()] = value;
                    }
                }
            });
            return {
                name: metadata.name || path.basename(filePath, '.md'),
                description: metadata.description || 'Custom persona',
                tools: metadata.tools || ['Bash', 'Read', 'Write', 'Edit'],
                systemPrompt: systemPrompt.trim(),
                metadata: {
                    version: metadata.version,
                    author: metadata.author,
                    categories: metadata.categories?.split(',').map((c) => c.trim()),
                },
            };
        }
        catch (error) {
            console.error(`Error parsing persona file ${filePath}:`, error);
            return null;
        }
    }
}
