Legend: [x] done · [~] initial pass done, deep-dive process authored · [>] process authored & ready to run

[~] - research and compare to references:
https://github.com/paperclipai/paperclip/tree/master/packages/adapters https://github.com/BloopAI/vibe-kanban/tree/main/crates/executors/src/executors https://github.com/Th0rgal/sandboxed.sh/tree/master/src/backend https://github.com/hiyenwong/matop/tree/main/crates/agentmon-adapters/src https://github.com/SihaoLiu/ai-usage/tree/main/src/data https://github.com/fotoetienne/gru/blob/main/src/claude_runner.rs https://github.com/fotoetienne/gru/blob/main/src/codex_backend.rs https://github.com/fotoetienne/gru/blob/main/src/claude_backend.rs
check for:
 - formats, syntaxes, patterns, best practices, etc.
 - performance, scalability, and security considerations
 - integration points, extensibility, and maintainability aspects
 - implementation details
 - caveats and naunces in the implementation, such as error handling, edge cases, etc.
 - parity and inconsistencies in our implementation compared to the popular working references.
→ Initial pass written: docs/16-reference-comparison.md. Deep per-file dive: .a5c/processes/reference-parity-research.js

[>] - find more battle tested references in existing project for functionalities and features we don't have reference and evidence for.
 - in monitoring and orchestration tools that support various harnesses and agents - for example cctop
 - in open source projects and libraries that implement similar functionalities and features to the ones mentioned above.
 - ui wrappers that provide an interface above one or more harnesses, such as vibe-kanban, etc.
then perform the same research and analysis as mentioned above for these new references.
→ Process: .a5c/processes/find-more-references.js (feeds reference-parity-research.js)

[x] - create a skill and babysitter process to research and integrate a new harness, add tests for it, covering all the docs and integration points, test coverage, use cases, etc. (in .claude/skills/ and in .a5c/processes/ )
→ Skill: .claude/skills/integrate-harness/SKILL.md. Process: .a5c/processes/integrate-harness.js (js, not md) + integrate-harness-inputs.json.

[~] - add full docker based e2e testing for all the harnesses and all the functionalities. one set for with credentials (against the real CLIs) and the other set for without credentials (against the harness-mock cli), add support in the sdk and cli for running with the mock harness instead of the real ones. (using a flag and env variable, for example --use-mock-harness and USE_MOCK_HARNESS=true)
→ Scaffold: --use-mock-harness flag + USE_MOCK_HARNESS env in CLI; docker/e2e/{Dockerfile.mock,Dockerfile.real,docker-compose.yml,README.md}; CI job in e2e.yml. Full 11-adapter matrix: .a5c/processes/docker-e2e-matrix.js

[x] - publish script for packages, including the core package and the harnesses, with support for publishing to npm and other registries, with proper versioning, changelog generation, and release notes. (using a tool like changesets or standard-version)
→ Changesets (.changeset/config.json fixed group), npm provenance in publish.yml, release.yml runs changesets/action@v1. Scripts: npm run changeset / version-packages / release.

[~] - create a comprehensive documentation for the core package and the harnesses, including installation guides, usage examples, API reference, contribution guidelines, and troubleshooting tips. ( in docs/). and also create a documentation website using a tool like Docusaurus or Gatsby, and host it on GitHub Pages. for this repo (@a5c-ai/agent-mux)
→ docs/README.md index, docs/16-reference-comparison.md, CONTRIBUTING.md updated, SECURITY.md, CODE_OF_CONDUCT.md, issue+PR templates. Docusaurus in website/ with .github/workflows/docs.yml (Pages deploy). Per-adapter pages + tutorials: .a5c/processes/docs-site.js

[>] - research a5c-ai/babysitter (staging branch) for the harnesses adapters in sdk there. see if we missed any generic features or functionalities that we can integrate into this sdk. also look for parities and inconsistencies in our implementation compared to the ones in babysitter, and address them accordingly. also look for any caveats and nuances in the implementation of the harnesses adapters in babysitter, such as error handling, edge cases, etc. and make sure we have proper handling for those in our implementation as well.
→ Process: .a5c/processes/babysitter-parity.js

---

Run remaining [>] / [~] items:

```bash
babysitter run .a5c/processes/integrate-harness.js          # e.g. add qwen
babysitter run .a5c/processes/reference-parity-research.js
babysitter run .a5c/processes/find-more-references.js
babysitter run .a5c/processes/docker-e2e-matrix.js
babysitter run .a5c/processes/docs-site.js
babysitter run .a5c/processes/babysitter-parity.js
```
