# Mintlify Starter Kit

Click on `Use this template` to copy the Mintlify starter kit. The starter kit contains examples including

- Guide pages
- Navigation
- Customizations
- API Reference pages
- Use of popular components

### Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mintlify) to preview the documentation changes locally. To install, use the following command

```
npm i -g mintlify
```

Run the following command at the root of your documentation (where mint.json is)

```
mintlify dev
```

Or with the included Makefile:

```
make dev
```

### Sync the OpenAPI spec

Keep the API Playground in sync with your FastAPI project by copying its `openapi.json` into this repo.

Option 1 — use the helper script (defaults to your provided path):

```
bash scripts/sync-openapi.sh
```

Option 2 — specify a custom source path:

```
SRC=/path/to/fastapi/openapi.json bash scripts/sync-openapi.sh
# or
bash scripts/sync-openapi.sh /path/to/fastapi/openapi.json
```

Optional: also update `api-reference/openapi.json` by setting an env var:

```
COPY_TO_API_REF=1 bash scripts/sync-openapi.sh
```

After syncing, run `mintlify dev` and open the “Playground” tab or visit `/api`.

Alternatively, use the Makefile helper:

```
make sync-openapi SRC=/path/to/openapi.json COPY_TO_API_REF=1
```

### GitHub Action: Sync OpenAPI

This repo includes a reusable workflow to sync the OpenAPI spec in CI: `.github/workflows/sync-openapi.yml`.

Trigger it manually from the Actions tab (Workflow Dispatch) with either mode:

1) From a URL

- mode: `url`
- openapi_url: `https://example.com/openapi.json`
- copy_to_api_ref: `true` (optional)

2) From another repo (public or private)

- mode: `repo`
- spec_repo: `owner/repo`
- spec_ref: `main` (or any branch/tag)
- spec_path: `path/in/repo/openapi.json`
- copy_to_api_ref: `true` (optional)

For private repos, add a `GH_PAT` repository secret with `repo` scope; the workflow will use it automatically (falls back to `GITHUB_TOKEN` for public repos).

### Publishing Changes

Install our Github App to auto propagate changes from your repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch. Find the link to install on your dashboard. 

#### Troubleshooting

- Mintlify dev isn't running - Run `mintlify install` it'll re-install dependencies.
- Page loads as a 404 - Make sure you are running in a folder with `mint.json`
