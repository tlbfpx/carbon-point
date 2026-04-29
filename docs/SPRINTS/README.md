# Sprint Files

This directory contains sprint definition files in markdown format.
Each file represents one sprint with its context and tasks.

## Format

Each sprint file follows the template structure. See `TEMPLATE.md` for the full format.

Key elements:
- **Title**: `# Sprint X - Name` (H1 heading)
- **Status**: `planned`, `active`, or `completed`
- **Context**: Mini-PRD with motivation, code state, decisions, references
- **Tasks**: Checkbox list grouped by sections

## Usage

### Create a new sprint
Copy `TEMPLATE.md` to `sprint-XX.md` and fill in the sections.

### Import tasks from a sprint file
```bash
cam sprint import docs/SPRINTS/sprint-01.md
```

### List all sprints
```bash
cam sprint list
```

### Check sprint progress
```bash
cam sprint status
```

## Task Format

```markdown
- [ ] Task title
  Priority: high | medium | low
  Tags: tag1, tag2
  Description: Detailed description.
  Files: path/to/file1.ts, path/to/file2.ts
```

- `[x]` = completed, `[ ]` = planned/pending
- All metadata lines (Priority, Tags, Description, Files) are optional
