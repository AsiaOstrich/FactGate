# Project Context

## Purpose
FactGate is an MCP (Model Context Protocol) Server designed to prevent AI hallucinations by providing fact-checking and verification capabilities. The project solves the problem of AI models confidently generating false or unverifiable information by offering a reusable, server-based solution that can validate and cross-reference AI-generated content against reliable knowledge sources.

**Goals:**
- Create a reliable fact-checking service accessible via MCP protocol
- Integrate with Claude and other AI systems for real-time verification
- Reduce hallucination risk in AI-generated responses
- Provide a foundation for extensible fact validation

## Tech Stack
- **Runtime:** Node.js 20.19.0 or higher
- **Package Manager:** npm
- **Development Framework:** @fission-ai/openspec v0.12.0 (spec-driven development)
- **CLI Tools:** Commander, Inquirer, Chalk, Zod, Ora
- **Core Protocol:** MCP (Model Context Protocol)

## Project Conventions

### Code Style
- **Simplicity-first approach:** Default to <100 lines of new code per change
- **Single-file implementations** until complexity proves insufficient
- **Boring, proven patterns** over cutting-edge solutions
- **Naming conventions:** Verb-noun format for capabilities (e.g., `fact-validation`, `user-auth`)
- **Code readability:** Each capability must be understandable within 10 minutes
- **Avoid frameworks** without clear justification

### Architecture Patterns
- **Spec-driven architecture:** All capabilities are defined through formal specifications before implementation
- **Proposal-based change management:** Features and changes follow a three-stage workflow:
  1. **Propose:** Create change proposal with rationale and design
  2. **Implement:** Follow approved specifications
  3. **Archive:** Move to archive after deployment
- **Change ID format:** Kebab-case with verb prefixes (`add-`, `update-`, `remove-`, `refactor-`)
- **Complexity triggers:** Only increase architectural complexity when:
  - Performance data shows current approach is insufficient
  - Scale requirements exist (>1000 users, >100MB data)
  - Multiple proven use cases require abstraction
- **Multi-service changes:** Require `design.md` to document architectural decisions before coding

### Testing Strategy
- **Specification-driven testing:** Tests validate compliance with formal specifications
- **Scenario-based validation:** At least one scenario per requirement in specs
- **Validation checkpoints:** Use `openspec validate [change] --strict` before implementation
- **Test inclusion:** Implementation tasks include "Write tests" checkpoints
- **Test-first approach:** Tests should verify spec requirements are met

### Git Workflow
- **Branch strategy:** Feature branches for each change proposal
- **Branch naming:** `feature/[change-id]` (e.g., `feature/add-fact-validation`)
- **Commit conventions:** Semantic commits aligned with OpenSpec proposals
- **Change references:** All commits should reference the proposal/change-id
- **Pull requests:** Must reference change proposal and validate against `proposal.md` and `design.md`
- **Validation gates:** Code review validates against specifications before merge
- **Change archival:** After deployment, changes move to `changes/archive/YYYY-MM-DD-[name]/`

## Domain Context

**AI Hallucination Problem:**
AI models can generate plausible but false information with high confidence. This is a critical issue for production AI systems where accuracy is essential.

**FactGate Solution:**
- Provides fact-checking as a service via MCP protocol
- Enables other AI systems to verify information in real-time
- Likely integrates with knowledge bases, APIs, or fact-checking databases
- Designed as a reusable component in larger AI systems

**OpenSpec Framework Context:**
This project uses specification-driven development. All changes must first be proposed with clear requirements and design, validated, then implemented. This ensures alignment between design intent and implementation.

## Important Constraints

- **Node.js version requirement:** Minimum v20.19.0 (required by @fission-ai/openspec)
- **MCP protocol compatibility:** Must comply with Model Context Protocol standards
- **Single-service focus:** Keep scope focused on fact-checking/verification to maintain clarity
- **Accuracy critical:** Fact-checking must be reliable; false positives/negatives have real impact
- **Performance:** Must respond quickly for real-time integration with AI systems

## External Dependencies

- **@fission-ai/openspec (v0.12.0):** Spec-driven development framework and CLI
- **Model Context Protocol (MCP):** Protocol for AI system integration
- **Fact-checking sources:** (To be determined) - Knowledge bases, APIs, or databases to source verification data
- **Node.js ecosystem:** Standard npm packages (Commander, Inquirer, Chalk, Zod, Ora)
