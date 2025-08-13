# VSCode Integration Disabled

This VSCode IDE companion package is **disabled** in Warpio CLI.

## Reason

Warpio CLI focuses on terminal-based scientific computing workflows and does not support VSCode integration.

## Impact

- This package is excluded from the main workspace
- It will not be built or tested as part of the main build process
- Future upstream merges from google-gemini/gemini-cli will not affect Warpio functionality

## For Developers

If you need to work with this package for upstream compatibility:

```bash
cd packages/vscode-ide-companion
npm install
npm run build
```

But note that any changes here will not be part of the Warpio distribution.
