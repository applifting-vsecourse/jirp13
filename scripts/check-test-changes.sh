#!/usr/bin/env bash
# Fails when a branch removes or rewrites lines in existing test files. Added
# lines are fine: new test files, new tests, new checks inside a test.
#
#   scripts/check-test-changes.sh <base-ref>    e.g. origin/main
set -euo pipefail

base="${1:?usage: check-test-changes.sh <base-ref>}"
cd "$(git rev-parse --show-toplevel)"

# --no-renames: a renamed or moved test shows up as removed lines under its old
# path, so renaming a test out of the patterns below cannot hide it.
numstat="$(git -c core.quotePath=false diff --numstat --no-renames "$base...HEAD" -- \
  ':(glob)**/*.spec.ts' \
  ':(glob)**/*.int-spec.ts' \
  ':(glob)**/*.test.ts' \
  ':(glob)**/*.test.tsx' \
  ':(glob)apps/frontend/e2e/**')"

# Columns are: added, removed, path. Binary files report "-" for both counts.
changed="$(awk -F '\t' 'NF && $2 != "0" { print "  " $3 " (removed or rewritten lines: " $2 ")" }' <<<"$numstat")"

if [[ -n "$changed" ]]; then
  echo "Existing tests were changed compared with $base:"
  echo "$changed"
  echo "If this is intentional, explain why in the pull request."
  exit 1
fi

echo "No existing test lines were removed or rewritten compared with $base."
