---
applyTo: '**'
---

# Development Preferences and Guidelines

## Version Control
- **ALWAYS create a git commit before implementing any new feature or starting significant work**
- This ensures we can track changes and roll back if needed

## Code Quality Standards

### Type Safety
- **Use Strict Types whenever possible** to reduce code complexity and ambiguity
- Avoid `any` types unless absolutely necessary
- Leverage TypeScript's type system fully

### Code Cleanliness
- **Always clean up unused code blocks and imports** that may negatively impact the product
- Remove commented-out code unless there's a specific reason to keep it
- Keep imports organized and remove unused ones

## Documentation

### Single Source of Truth
- **Maintain a centralized README.md file as the ONLY source of truth in the project**
- No multiple documentation files should be created
- The README.md must include:
  - **Current tech stack** - List all technologies, frameworks, and major dependencies
  - **Features** - Comprehensive list of all implemented features
  - **Known bugs and code issues** - Document any current bugs or technical debt discovered through project scans

## Development Workflow

### Testing
- **Let the user test by themselves** before deciding that a feature or bug fix is correctly implemented
- Do not assume success - wait for user confirmation

### Implementation Planning
- **Unless specifically stated otherwise, all implementations should be scoped and decided before the start of execution**
- Discuss the approach and get approval before making changes
- Clarify requirements upfront to avoid rework

### Terminal Usage
- **NEVER run the localhost server and then run another command in the same terminal**
- The server will be stopped and cause a "server stopped" error
- Always use separate terminals for long-running processes (servers) and other commands
- Use `isBackground=true` when starting servers to keep them running
