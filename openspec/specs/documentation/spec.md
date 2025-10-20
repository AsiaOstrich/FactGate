# documentation Specification

## Purpose
TBD - created by archiving change refactor-dev-documentation. Update Purpose after archive.
## Requirements
### Requirement: Development Guide
The project SHALL provide a comprehensive development guide documenting code style, Git workflow, and commit conventions to support consistent development practices.

#### Scenario: Developer onboarding
- **WHEN** a new developer joins the project
- **THEN** they can find the `DEVELOPMENT.md` guide in the project root
- **AND** the guide provides clear sections on naming conventions, code comments, Git workflow, and commit message standards

#### Scenario: Development question reference
- **WHEN** a developer has questions about project conventions
- **THEN** they can refer to the development guide for authoritative answers

### Requirement: Internationalization Support
The project SHALL provide documentation in multiple languages to support international contributors and reduce language barriers.

#### Scenario: Non-English developer
- **WHEN** a developer prefers Traditional Chinese
- **THEN** they can access `docs/zh-TW/DEVELOPMENT.zh-TW.md` with equivalent content
- **AND** both versions maintain the same technical standards and conventions

#### Scenario: Translation maintenance
- **WHEN** documentation is updated in one language
- **THEN** translators can identify changes needed in other language versions

### Requirement: AI Assistant Configuration
The project SHALL provide a template for developers to configure their AI assistant (Claude Code) system prompts, enabling personalized development workflows.

#### Scenario: Claude Code configuration
- **WHEN** a developer wants to configure Claude Code
- **THEN** they can copy `.claude/system-prompt.example.md` as a template
- **AND** they can customize it based on their workflow preferences

#### Scenario: Personal configuration isolation
- **WHEN** a developer creates `.claude/system-prompt.md`
- **THEN** this file is git-ignored and not committed to the repository
- **AND** they can safely use language-specific or personalized configurations

#### Scenario: Symlink to preferred language
- **WHEN** a developer wants Claude Code to use a specific language
- **THEN** they can create a symlink from `.claude/system-prompt.md` to their preferred version
- **AND** changes to the source documentation automatically reflect in their Claude Code configuration

