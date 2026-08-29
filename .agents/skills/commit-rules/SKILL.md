---
name: commit-rules
description: >-
  Use this skill whenever creating git commits, preparing commit messages, or reviewing changes for version control in this repository. Enforces the project's mandatory [NAMESPACE] commit format and conventions.
---

# Commit Rules & Git Workflow

Follow these guidelines for all git commit operations in this project to maintain a clean, readable, and structured commit history.

---

## 1. Commit Message Format

Every commit message MUST adhere to the following pattern:

```text
[NAMESPACE] Short, clear description of the change
```

---

## 2. Commit Namespaces

Use the appropriate uppercase namespace tag at the beginning of the commit message:

| Namespace | When to Use | Example |
| :--- | :--- | :--- |
| **`[ADD]`** | Adding a new feature, file, or functionality | `[ADD] Implement user authentication` |
| **`[FEATURE]`** | Enhancing or expanding an existing feature | `[FEATURE] Improve search functionality` |
| **`[DELETE]`** | Removing a feature, file, or redundant code | `[DELETE] Remove deprecated API routes` |
| **`[REFACTOR]`** | Refactoring code without altering external behavior | `[REFACTOR] Optimize database queries` |
| **`[FIX]`** | Fixing a bug, issue, or broken behavior | `[FIX] Resolve login page crash` |
| **`[DOCS]`** | Adding or updating documentation, READMEs, or comments | `[DOCS] Update API documentation` |
| **`[TEST]`** | Adding, updating, or fixing tests | `[TEST] Add unit tests for user service` |
| **`[CONFIG]`** | Modifying configuration files, environment configs, or settings | `[CONFIG] Update database connection settings` |
| **`[STYLE]`** | Cosmetic/stylistic changes (indentation, whitespace, formatting) | `[STYLE] Fix indentation and remove extra spaces` |
| **`[PERF]`** | Performance improvements and optimizations | `[PERF] Optimize image loading` |
| **`[BUILD]`** | Updating build scripts, toolchains, or dependencies | `[BUILD] Upgrade to Node.js 18` |
| **`[CI]`** | Modifying CI/CD pipelines, workflows, or GitHub Actions | `[CI] Add GitHub Actions for automated testing` |

---

## 3. Best Practices & Rules

1. **Keep Commits Atomic & Small**: Each commit should focus on a single logical task or change.
2. **Write Meaningful Descriptions**: Be specific and clear about what changed and why. Avoid vague messages like `[FIX] Fixed bug` or `[UPDATE] Code changes`.
3. **Group Related Changes**: Keep changes belonging to the same feature together in one commit.
4. **Code Cleanliness Before Committing**:
   - Ensure consistent indentation and formatting.
   - Remove unused debug logs, console prints, and commented-out code.
