# Branch Protection Rules

This document describes the recommended branch protection rules for the FactGate repository.

## Master Branch Protection

### Recommended Settings

To configure branch protection, visit:
**https://github.com/AsiaOstrich/FactGate/settings/branches**

### Protection Rules

1. **✅ Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale reviews when new commits are pushed: ✅
   - Require review from Code Owners: ⚠️ (if CODEOWNERS file exists)

2. **✅ Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - Status checks: (configure CI/CD checks as they become available)

3. **✅ Require conversation resolution before merging**
   - All PR conversations must be resolved before merging

4. **✅ Restrict who can push to matching branches**
   - Only repository administrators can directly push to master
   - Used for emergency hotfixes only

5. **✅ Do not allow bypassing the above settings**
   - Administrators must follow the same rules

### Configuration Steps

1. Navigate to repository Settings → Branches
2. Click "Add branch protection rule"
3. Set branch name pattern: `master`
4. Enable the above protection rules
5. Save changes

### Emergency Hotfix Process

For critical production issues that require immediate fixes:

1. Administrator pushes directly to master (only in emergencies)
2. Create a follow-up PR documenting the hotfix
3. Notify the team via appropriate channels
4. Document the incident and improvement actions

### Best Practices

- **Always use Pull Requests** for normal development
- **Keep PRs focused** on single features or fixes
- **Request reviews** from relevant team members
- **Respond to feedback** promptly
- **Keep master deployable** at all times

## Related Documentation

- [Development Guide](../DEVELOPMENT.md) - Git workflow and coding standards
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [Pull Request Template](pull_request_template.md) - PR submission guidelines

---

🌏 **繁體中文版本** / [Chinese Version](branch-protection_zh-TW.md)
