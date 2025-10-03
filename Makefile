SHELL := /bin/bash

# Path to the source OpenAPI file. Override with `make sync-openapi SRC=/path/to/openapi.json`.
SRC ?= /Users/0xnexis/Downloads/fastapi-langgraph-agent-production-ready-template-master/openapi.json

# Also update api-reference/openapi.json when set to 1.
COPY_TO_API_REF ?= 0

.PHONY: sync-openapi dev

sync-openapi:
	@echo "Syncing OpenAPI from: $(SRC)"
	SRC="$(SRC)" COPY_TO_API_REF=$(COPY_TO_API_REF) bash scripts/sync-openapi.sh

dev:
	mintlify dev

