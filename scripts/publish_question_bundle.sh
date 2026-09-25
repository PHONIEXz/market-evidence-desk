#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
python3 scripts/build_question_bundle.py
python3 scripts/validate_seed.py

if [[ "${1:-}" != "--apply" ]]; then
  echo 'Dry run complete. Review sanity/seed/investor-protection-questions.json, then run:'
  echo 'bash scripts/publish_question_bundle.sh --apply'
  exit 0
fi

"./node_modules/.bin/sanity" documents create \
  sanity/seed/investor-protection-questions.json --missing \
  --project-id cxjysvlq --dataset production
python3 scripts/verify_published_questions.py
