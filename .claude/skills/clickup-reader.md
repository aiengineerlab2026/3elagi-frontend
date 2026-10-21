# Skill: ClickUp Ticket Reader & Analyzer

## Purpose
Read ClickUp tickets via MCP and produce a structured implementation brief
that the implementer agent can act on without ambiguity.

## Reading Rules
- Always fetch: title, description, acceptance criteria, priority, assignee, linked tasks
- If acceptance criteria is missing, derive it from the description and flag it
- If the ticket is a parent task, fetch all subtasks too
- Never assume context not written in the ticket — flag missing info explicitly

## Analysis Rules
- Identify ticket type: feature / bug / refactor / chore
- Extract affected areas: component names, routes, services, API endpoints
- List explicit requirements (what MUST be done)
- List implicit requirements (what is implied but not stated)
- Flag blockers or dependencies on other tickets

## Output Format
Always respond with this exact structure:

```
## Ticket Summary
- ID: 
- Title:
- Type: feature | bug | refactor | chore
- Priority: urgent | high | normal | low

## Acceptance Criteria
(list each criterion as a checkbox)
- [ ] ...

## Affected Areas
- Components:
- Routes:
- Services/Hooks:
- API:

## Explicit Requirements
- ...

## Implicit Requirements
- ...

## Flags & Blockers
- ...

## Implementation Hints
(anything in the ticket that hints at HOW to implement, not just WHAT)
- ...
```

## Quality Checks
- Never skip the Flags section — write "None" if clean
- If ticket description is under 3 lines, flag as "under-specified"
- If acceptance criteria is missing entirely, write derived criteria and mark as [DERIVED]