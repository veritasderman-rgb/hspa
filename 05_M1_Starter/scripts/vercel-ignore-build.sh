#!/usr/bin/env bash
# Vercel "Ignored Build Step" projektu hspa
# (Vercel → Settings → Build and Deployment → Ignored Build Step:
#  `bash scripts/vercel-ignore-build.sh`, běží v 05_M1_Starter).
#
# Exit 0 = build přeskočit, exit 1 = stavět. Při jakékoli nejistotě stavíme.
#
# Proč: obsahový merge do main mění vstupy builderů, ale ne generované
# artefakty (viz .github/workflows/regenerate-artifacts.yml). Hned po něm
# commitne bot přegenerované artefakty — Vercel by tak stavěl dvakrát po sobě
# a první build by měl zastaralé indexy. Build merge commitu proto přeskočíme
# a postaví se až commit od bota. Když regenerace nic nezmění, bot pushne
# prázdný commit, aby deploy proběhl i tak.

# Preview buildy nestavíme. Prázdné nebo neznámé VERCEL_ENV (např. vypnuté
# „Automatically expose System Environment Variables“) = nejistota → stavíme.
[ "$VERCEL_ENV" = "preview" ] && exit 0
[ "$VERCEL_ENV" = "production" ] || exit 1

# Commity od bota (crony, regenerace) stavíme vždy. Pushe s GITHUB_TOKEN
# regeneraci nespouštějí, takže by po nich žádný další commit nepřišel.
[ "$VERCEL_GIT_COMMIT_AUTHOR_LOGIN" = "github-actions[bot]" ] && exit 1
case "$VERCEL_GIT_COMMIT_MESSAGE" in *"[skip regen]"*) exit 1 ;; esac

# Porovnáváme s posledním nasazeným commitem; když ho mělký klon nemá, stavíme.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "${BASE}^{commit}" 2>/dev/null || exit 1

# Vstupy builderů — drž v syncu s `paths` v regenerate-artifacts.yml.
INPUTS=(
  'data/articles.json' 'data/indicators.json' 'data/system-model.json'
  'data/legislativa.json' 'data/claims.json' 'data/barometr.json'
  'data/levers.json' 'data/vyhlaska-hra.json' 'data/personal-checks.json'
  'data/prevention.json' 'data/regions.json'
  'clanek-*.html' 'src/styles.css' 'scripts/build-*.js' 'scripts/lib/'
  'scripts/minify-css.mjs' 'package.json' 'package-lock.json'
)
ARTIFACTS=(
  'data/search-index.json' 'data/diagnoza-index.json'
  'data/souvislosti.json' 'src/styles.min.css'
)

git diff --quiet "$BASE" HEAD -- "${INPUTS[@]}";    inputs=$?
git diff --quiet "$BASE" HEAD -- "${ARTIFACTS[@]}"; artifacts=$?

# Vstupy změněné (1) a artefakty beze změny (0) → dorazí commit od bota.
if [ "$inputs" -eq 1 ] && [ "$artifacts" -eq 0 ]; then
  echo "Přeskakuji: vstupy builderů se změnily, artefakty dorazí commitem z regenerate-artifacts.yml."
  exit 0
fi
exit 1
