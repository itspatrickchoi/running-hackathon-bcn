# Working in this repo

## Always give the user a preview link

This app deploys on Netlify, which builds a Deploy Preview (frontend + `netlify/functions`) for every pull request.
After pushing a change:

1. Open a **draft PR** for the branch into `main`, or reuse the open PR for that branch.
2. Wait for the Netlify deploy-preview check or bot comment, then give the user the preview URL
   (`https://deploy-preview-<PR#>--<site>.netlify.app`) so they can test the change right away.
3. If no Netlify check shows up, tell the user that deploy previews may be off or the repo not linked
   (Netlify → Site configuration → Build & deploy → Continuous deployment → Deploy Previews), and that the
   `ANTHROPIC_API_KEY` / AI Gateway env var must apply to the "Deploy Previews" context.

## Checks before pushing

- `npm run build` must pass.
