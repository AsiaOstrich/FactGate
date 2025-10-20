# Refactor Development Documentation

## Why

The current system prompt (`claude-code-system-prompt.md`) is in Traditional Chinese and located at the project root, which creates barriers for international contributors. This change reorganizes documentation to:

1. Support international collaboration with English as the primary language
2. Provide localized versions for non-English speakers
3. Separate project-wide documentation from personal AI assistant configuration

This aligns with open-source best practices and makes the project more accessible to a global audience.

## What Changes

- **Create** `DEVELOPMENT.md` - English development guide covering code style, Git workflow, and commit conventions
- **Add** `docs/zh-TW/DEVELOPMENT.zh-TW.md` - Traditional Chinese translation of the development guide
- **Add** `.claude/system-prompt.example.md` - Template for developers to configure Claude Code AI assistant
- **Update** `.gitignore` - Exclude personal Claude Code settings (`.claude/system-prompt.md`) from version control
- **Update** `README.md` - Add clear links to documentation resources
- **Remove** `claude-code-system-prompt.md` - Obsolete file replaced by language-specific versions

## Impact

- **Affected specs**: `documentation` (new capability specification)
- **Affected code**: None (documentation-only change, no runtime impact)
- **Breaking changes**: None (developers can continue using local configurations)
- **Migration path**: Developers currently using the old file should create `.claude/system-prompt.md` (git-ignored) and symlink to their preferred language version

## Benefits

- ✅ Improved onboarding for international contributors
- ✅ Single source of truth for development guidelines
- ✅ Personal configurations stay local and version-controlled
- ✅ Supports multilingual development teams
- ✅ Clear separation between project documentation and tooling configuration