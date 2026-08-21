#!/bin/bash
# SessionStart hook: nainstaluje npm závislosti 05_M1_Starter, aby testy,
# validátory a buildery fungovaly v Claude Code on the web hned od startu
# session. Lokálně (mimo web) nedělá nic.
set -euo pipefail

# Jen v remote prostředí (Claude Code on the web).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Kořen repa: preferuj $CLAUDE_PROJECT_DIR, fallback z umístění skriptu
# (hook leží v <repo>/.claude/hooks/).
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$REPO_ROOT/05_M1_Starter"

# Prohlížeče Playwright jsou v kontejneru předinstalované — nestahovat.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# npm install (ne ci): idempotentní a využije cache kontejneru.
# postinstall zároveň zaregistruje merge driver pro generované soubory
# (scripts/setup-git.js).
npm install --no-audit --no-fund
