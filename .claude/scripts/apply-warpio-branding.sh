#!/bin/bash
set -e

echo "🎨 Applying Warpio rebranding after upstream merge..."

# 1. CLI configuration
echo "📝 Updating CLI configuration..."
sed -i "s/.scriptName('gemini')/.scriptName('warpio')/g" packages/cli/src/config/config.ts
sed -i "s/Usage: gemini/Usage: warpio/g" packages/cli/src/config/config.ts
sed -i "s/Gemini CLI - Launch/Warpio CLI - Launch/g" packages/cli/src/config/config.ts
sed -i "s/Launch Gemini CLI/Launch Warpio CLI/g" packages/cli/src/config/config.ts

# 2. MCP commands
echo "🔧 Updating MCP commands..."
sed -i "s/Usage: gemini mcp/Usage: warpio mcp/g" packages/cli/src/commands/mcp/*.ts

# 3. UI commands
echo "🖥️  Updating UI commands..."
sed -i "s/for help on gemini-cli/for help on warpio-cli/g" packages/cli/src/ui/commands/helpCommand.ts
sed -i "s/Gemini CLI settings/Warpio CLI settings/g" packages/cli/src/ui/commands/settingsCommand.ts

# 4. Window title
echo "🪟 Updating window title..."
sed -i "s/Gemini - \${title}/Warpio - \${title}/g" packages/cli/src/gemini.tsx

# 5. Dialogs and UI
echo "💬 Updating dialogs and UI..."
sed -i "s/allows Gemini to execute/allows Warpio to execute/g" packages/cli/src/ui/components/FolderTrustDialog.tsx
sed -i "s/Gemini CLI must be restarted/Warpio CLI must be restarted/g" packages/cli/src/ui/components/SettingsDialog.tsx

# 6. Error messages
echo "⚠️  Updating error messages..."
sed -i "s/Gemini Code Assist and the Warpio CLI/Warpio CLI/g" packages/cli/src/ui/utils/errorParsing.ts

# 7. Persona system prompt
echo "🎭 Updating persona system prompt..."
sed -i "s/built upon the solid foundation of Google Gemini CLI/providing advanced scientific computing capabilities/g" packages/core/src/personas/persona-manager.ts

# 8. Settings
echo "⚙️  Updating settings..."
sed -i "s/The Gemini model to use/The AI model to use/g" packages/cli/src/config/settingsSchema.ts

# 9. IDE integration (user-facing only)
echo "🔌 Updating IDE integration messages..."
sed -i "s/run Gemini CLI in one/run Warpio CLI in one/g" packages/core/src/ide/ide-client.ts

echo "✅ Rebranding complete! Verifying build..."

# Verify changes
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed - check for syntax errors"
    exit 1
fi

if npm run typecheck > /dev/null 2>&1; then
    echo "✅ TypeScript checks passed!"
else
    echo "❌ TypeScript errors found"
    exit 1
fi

echo "🎉 Warpio rebranding applied successfully!"
echo ""
echo "Quick verification:"
echo "- Run 'npx warpio --help' to see Warpio CLI branding"
echo "- Run 'npx warpio mcp add --help' to verify command usage"
echo "- Window title should show 'Warpio' when CLI is running"