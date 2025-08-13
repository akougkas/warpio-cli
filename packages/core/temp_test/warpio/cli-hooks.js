/**
 * Warpio CLI Integration Hooks
 * Minimal interface points for CLI integration
 */
export function createWarpioCliHooks() {
    return {
        parsePersonaArgs(args) {
            return {
                persona: args.persona,
                listPersonas: args.listPersonas,
                personaHelp: args.personaHelp,
            };
        },
        async handlePersonaCommands(args) {
            const { WarpioPersonaManager } = await import('./manager.js');
            const manager = WarpioPersonaManager.getInstance();
            if (args.listPersonas) {
                console.log('Available Warpio personas:');
                const personas = manager.listPersonas();
                for (const persona of personas) {
                    const definition = manager.getPersona(persona);
                    if (definition) {
                        console.log(`  ${persona} - ${definition.description}`);
                    }
                }
                console.log('\nUse "warpio --persona <name>" to launch with a specific persona.');
                console.log('Use "warpio --persona-help <name>" for detailed information about a persona.');
                return true; // Exit after listing
            }
            if (args.personaHelp) {
                const helpText = manager.getPersonaHelp(args.personaHelp);
                console.log(helpText);
                return true; // Exit after help
            }
            return false; // Don't exit, continue with normal flow
        },
        async validatePersona(personaName) {
            const { WarpioPersonaManager } = await import('./manager.js');
            const manager = WarpioPersonaManager.getInstance();
            const availablePersonas = manager.listPersonas();
            return availablePersonas.includes(personaName);
        },
    };
}
