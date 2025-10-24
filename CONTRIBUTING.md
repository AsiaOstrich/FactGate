# Contributing to FactGate

Thank you for your interest in contributing to FactGate! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Commit Message Format](#commit-message-format)
- [Translation Guidelines](#translation-guidelines)
- [Questions and Support](#questions-and-support)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment. Be kind, professional, and considerate in all interactions.

## Getting Started

### Prerequisites

- Node.js 20.19.0 or higher
- npm package manager
- Git

### Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FactGate.git
   cd FactGate
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/AsiaOstrich/FactGate.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

## Development Workflow

We follow the **GitHub Flow** workflow. See our detailed [Development Guide](DEVELOPMENT.md) for comprehensive guidelines including:

- Code style and naming conventions
- Git branching strategy
- Commit message conventions
- Testing requirements

### Quick Workflow

1. **Create a feature branch**
   ```bash
   git checkout master
   git pull upstream master
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards in [DEVELOPMENT.md](DEVELOPMENT.md)
   - Write tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add <files>
   git commit -m "feat(scope): description"
   ```

4. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] Tests added/updated and passing
- [ ] Commit messages follow Conventional Commits

### PR Template

When creating a PR, our template will guide you through providing:
- Summary of changes
- Type of change
- Testing performed
- Checklist completion

### Review Process

1. **Automated checks** run on your PR (when CI is configured)
2. **Maintainer review** - at least one approval required
3. **Address feedback** - make requested changes
4. **Merge** - maintainer will merge after approval

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(adapters): add Wikipedia adapter` |
| `fix` | Bug fix | `fix(validation): handle null claims` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Code formatting | `style: fix indentation` |
| `refactor` | Code refactoring | `refactor(core): simplify validation logic` |
| `perf` | Performance improvement | `perf(cache): optimize lookup` |
| `test` | Test updates | `test(adapters): add unit tests` |
| `chore` | Build/tooling | `chore: update dependencies` |

### Scope

Optional but recommended. Indicates which part of the codebase is affected:
- `adapters` - Adapter system
- `validators` - Built-in validators
- `core` - Core verification logic
- `docs` - Documentation
- `config` - Configuration

### Examples

```bash
# Good commit messages
feat(adapters): add pluggable adapter interface
fix(validation): handle edge case for empty claims
docs: add Chinese translation for README
test(adapters): add integration tests for registry

# Bad commit messages (avoid these)
update code
fix bug
changes
wip
```

## Translation Guidelines

We welcome translations! FactGate supports multiple languages using a mirror structure.

### Structure

All translations go under `docs/zh-TW/` (or respective language code):

```
docs/
└── zh-TW/           # Traditional Chinese
    ├── README.zh-TW.md
    ├── DEVELOPMENT.zh-TW.md
    └── openspec/
        └── ...      # Mirror English structure
```

### Adding a Translation

1. **Create the language directory**
   ```bash
   mkdir -p docs/zh-TW/
   ```

2. **Translate the file**
   - Keep the same structure as the English version
   - Use `.zh-TW.md` suffix for Chinese files
   - Maintain formatting and code examples

3. **Update README.md**
   - Add link to your translation in the Documentation section

4. **Submit a PR**
   - Use commit message: `docs: add [Language] translation for [File]`

### Translation Synchronization

#### For PR Authors

When modifying English documentation:

1. **Check for translations**: Look for corresponding files in `docs/zh-TW/`
2. **Update translations**: If you can, update the Chinese version in the same PR
3. **Create tracking issue**: If you can't update translations, create an issue:
   - Title: `[Translation] Update zh-TW for [filename]`
   - Labels: `translation`, `documentation`
   - Link to the PR that modified the English version

#### For Reviewers

When reviewing documentation PRs, verify:

- [ ] Check if corresponding translations exist in `docs/zh-TW/`
- [ ] Verify translations are updated OR tracking issue is created
- [ ] Ensure both versions maintain same technical accuracy

#### Translation Status Tracking

- We use GitHub Issues with the `translation` label to track outdated translations
- Check [translation issues](https://github.com/AsiaOstrich/FactGate/labels/translation) for pending updates

#### Acceptable Update Delays

- **Minor fixes** (typos, formatting): Can delay translation up to 7 days
- **Major updates** (new sections, significant changes): Should translate within same PR
- **New features/documents**: Must include both English and Chinese versions

## Questions and Support

### Before Asking

- Check existing [Issues](https://github.com/AsiaOstrich/FactGate/issues)
- Read the [Development Guide](DEVELOPMENT.md)
- Review [Project Context](openspec/project.md)

### How to Ask

1. **For bugs**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
2. **For features**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. **For questions**: Open a general issue with clear description

## Project Structure

```
FactGate/
├── .github/              # GitHub templates and workflows
├── docs/                 # Multilingual documentation
│   └── zh-TW/           # Traditional Chinese translations
├── openspec/            # OpenSpec specification-driven development
│   ├── changes/         # Change proposals
│   └── specs/           # Feature specifications
├── DEVELOPMENT.md       # Development guide
├── CONTRIBUTING.md      # This file
└── README.md            # Project overview
```

## Recognition

Contributors are recognized in:
- Git commit history
- Pull Request acknowledgments
- Release notes (when applicable)

Thank you for contributing to FactGate! 🎉

---

🌏 [繁體中文版本 / Traditional Chinese Version](docs/zh-TW/CONTRIBUTING.zh-TW.md)
