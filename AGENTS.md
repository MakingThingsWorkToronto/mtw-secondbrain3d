# Second brain in 3D

AGENTS.md is the single instruction source. Claude Code loads it through CLAUDE.md; Codex reads it directly. No other website checkout, provider account or MCP server is needed to run this example.

## Reproduce after pulling

Install Node 24 or later and Claude Code or Codex, then:

```sh
git clone https://github.com/MakingThingsWorkToronto/mtw-secondbrain3d.git
cd mtw-secondbrain3d
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:8793/. Start an agent with `claude` or `codex` from this root and ask it to reproduce the README. Optional Blender authoring requires Blender; optional paid media work requires your own environment keys and explicit approval.

## Authoring

Use the repo-local paired .claude/skills and .codex/skills; begin with `blender-web-assets`. Preserve supplied stories, source models, original media, prior versions and third-party licences. Never infer human approval from a generated file or test. Keep credentials and workstation state out of Git.

The browser source is index.html and the asset folders. npm run studio opens the local asset review surface; the Blender generator or retained source geometry is documented in README.md.

## Verify and publish

Run npm test and npm run build. Check changed desktop, phone and reduced-motion behavior when browser access is available; report unperformed checks. Commit exact owned paths with `node scripts/git/commit-paths.mjs -m "message" -- paths`. Vercel serves `dist` at https://secondbrain3d.makingthings.work/. Publication requires the current user's authorization.
