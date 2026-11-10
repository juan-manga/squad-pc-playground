<!-- squad:begin (managed by Squad; do not edit between markers) -->
## Squad

This project uses Squad. Run `claude --agent squad --mcp-config .mcp.json` (interactive Claude Code does not load project-scoped `.mcp.json` servers until approved, so pass the config explicitly; or delegate to the `squad` subagent) to work with the team defined in `.squad/team.md`. Shared state is served by the `squad_state` MCP server in `.mcp.json`.
<!-- squad:end -->

<!-- squad-pc:start -->
@AGENTS.md

Project rules live in `AGENTS.md` (imported above) so every AI host shares one source of truth.
<!-- squad-pc:end -->
