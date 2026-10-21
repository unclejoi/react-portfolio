# Joi Emmanuel Holgado — Portfolio

React, TypeScript, and Vite frontend for Joi's portfolio. This repository deploys independently to Vercel. The portfolio assistant calls a separate Express backend deployed to Render; that backend owns the Gemini/Pinecone credentials and reads the existing `portfolio` index.

## Repositories

- **Frontend:** [unclejoi/react-portfolio](https://github.com/unclejoi/react-portfolio), this repository, with its own `package.json` and lockfile.
- **Backend:** [unclejoi/portfolio-backend](https://github.com/unclejoi/portfolio-backend), located beside this checkout at `../portfolio-backend` for local development. It has its own `package.json`, lockfile, environment settings, and deployment instructions.

Neither package needs an npm workspace or files from the other repository to build or deploy.

## Run locally

Use Node.js 22.16+ and open a terminal in each repository.

In the backend repository, install dependencies, configure its server-only `.env`, and start the API according to its README:

```sh
cd ../portfolio-backend
npm install
npm run dev
```

The local backend listens at `http://127.0.0.1:3001`. Its `FRONTEND_ORIGINS` setting must include `http://127.0.0.1:4173`, the frontend development origin.

In this frontend repository:

```sh
npm install
```

Copy `.env.example` to `.env`. In PowerShell:

```powershell
Copy-Item .env.example .env
```

The frontend `.env` contains only the public backend origin:

```dotenv
VITE_API_URL=http://127.0.0.1:3001
```

```sh
npm run dev
```

Open **http://127.0.0.1:4173**. The browser posts directly to `${VITE_API_URL}/api/chat`; there is no development proxy or bundled API server. A trailing slash on `VITE_API_URL` is accepted and removed. Use an HTTP(S) origin without an `/api` path, credentials, query string, or fragment.

If `VITE_API_URL` is omitted during development, it defaults to `http://127.0.0.1:3001`. Production builds require it explicitly so a deployment cannot silently point visitors to their own computer. On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`.

## Deploy the frontend to Vercel

Import this frontend repository into a Vercel project. Use:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable `VITE_API_URL` | Your Render backend origin, e.g. `https://portfolio-api.onrender.com` |

`vercel.json` records the framework, build command, and output directory. Add `VITE_API_URL` to each Vercel environment you deploy, including Preview if you use preview deployments. Vite substitutes it at build time, so changing it requires redeploying the frontend. Use the backend's HTTPS origin for the HTTPS Vercel site.

Vercel serves the generated static assets; it does not run Express. In-page navigation uses section anchors, so no SPA rewrite is needed. See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

## Connect the Render backend

Deploy the separate backend repository as a Render Web Service using its README. The backend needs these settings:

| Setting | Value |
| --- | --- |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| `HOST` | `0.0.0.0` |
| `FRONTEND_ORIGINS` | Your exact frontend origin, e.g. `https://your-portfolio.vercel.app` |

Let Render provide `PORT`. Put Gemini/Pinecone keys and existing-index settings only in the backend's environment. See [Render's port binding requirements](https://render.com/docs/web-services#port-binding).

`FRONTEND_ORIGINS` is a comma-separated list of exact origins. Include your custom domain, stable Vercel deployment domain, and any preview domain you want to allow. Origins include the scheme and optional port, without paths or trailing slashes. Wildcards are not used. Update the backend environment and restart/redeploy it after changing allowed origins. A new Vercel preview hostname needs its own entry before that preview can call the API.

For example, in Render:

```dotenv
FRONTEND_ORIGINS=https://your-portfolio.vercel.app,https://your-domain.com
```

Then, in Vercel:

```dotenv
VITE_API_URL=https://portfolio-api.onrender.com
```

Check the backend health endpoint directly and ask a question from the Vercel site after deployment. If the website loads but chat cannot connect, verify the compiled API URL and the backend's allowed origin match your deployed URLs, then inspect the browser Network panel and Render logs.

All `VITE_` values are public and included in browser assets. Never add API keys to this repository or to any `VITE_` variable. The frontend sends questions and a short conversation history to the backend, which calls Gemini and Pinecone. The application does not persist chat history.

## Build and preview

```sh
npm run typecheck
npm run build
npm run preview
```

The build emits the static site to `dist/`. Preview serves that site at **http://127.0.0.1:4173** and uses the API origin that was configured when it was built. Start the backend separately if you want to use chat during preview. This repository does not have a Node production server or backend test/ingestion scripts.

## Portfolio content and chat

Portfolio copy, experience, skills, and links live in `src/data.ts` and the page components. Portraits and the downloadable resume live under `public/assets/`. Keep professional titles, employers, dates, qualifications, and skills consistent with supporting source material.

The assistant answers conversationally with numbered citations and expandable source passages. It uses the existing Pinecone `portfolio` index through the backend and refuses questions without supporting evidence. Updating the downloadable resume does not change the assistant's indexed evidence. Manage Pinecone records separately using the same embedding model, dimensions, namespace, and `metadata.text` format described in the backend README.

Rebuild/redeploy the frontend after changing public assets, because Vite copies them into `dist/`.

## Source layout

- `src/data.ts`: profile, experience, skills, and portfolio links.
- `src/components/`: portfolio sections and shared UI.
- `src/components/ResumeChat/`: questions, conversation history, loading/retry/reset, and sources.
- `public/assets/`: portraits and downloadable resume.
- `vite.config.ts`: development server and public API-origin validation.
- `vercel.json`: Vercel build/output settings.
