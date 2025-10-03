#!/usr/bin/env bash
set -euo pipefail

# Sync the FastAPI project's OpenAPI spec into this docs repo.
#
# Usage:
#   bash scripts/sync-openapi.sh [SOURCE_OPENAPI_JSON]
#
# Environment variables:
#   SRC: path to the source openapi.json (overrides positional arg)
#   COPY_TO_API_REF=1: also copy to api-reference/openapi.json
#
# Defaults to the path you provided in your request.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
DEST_ROOT_OPENAPI="$REPO_ROOT/openapi.json"
DEST_API_REF_OPENAPI="$REPO_ROOT/api-reference/openapi.json"

DEFAULT_SRC="/Users/0xnexis/Downloads/fastapi-langgraph-agent-production-ready-template-master/openapi.json"
SRC_PATH="${SRC:-${1:-$DEFAULT_SRC}}"

if [[ ! -f "$SRC_PATH" ]]; then
  echo "Error: Source OpenAPI file not found: $SRC_PATH" >&2
  exit 1
fi

# Validate JSON if jq is available
if command -v jq >/dev/null 2>&1; then
  if ! jq -e . "$SRC_PATH" >/dev/null 2>&1; then
    echo "Error: Source file is not valid JSON: $SRC_PATH" >&2
    exit 1
  fi
else
  echo "Warning: jq not found; skipping JSON validation." >&2
fi

echo "Syncing OpenAPI spec..."

if cmp -s "$SRC_PATH" "$DEST_ROOT_OPENAPI"; then
  echo "- Root openapi.json already up to date"
else
  cp -f "$SRC_PATH" "$DEST_ROOT_OPENAPI"
  echo "- Updated $DEST_ROOT_OPENAPI"
fi

if [[ "${COPY_TO_API_REF:-0}" == "1" ]]; then
  if [[ -f "$DEST_API_REF_OPENAPI" ]]; then
    if cmp -s "$SRC_PATH" "$DEST_API_REF_OPENAPI"; then
      echo "- api-reference/openapi.json already up to date"
    else
      cp -f "$SRC_PATH" "$DEST_API_REF_OPENAPI"
      echo "- Updated $DEST_API_REF_OPENAPI"
    fi
  else
    echo "- Skipping api-reference/openapi.json (file not present)"
  fi
fi

echo "Done."

