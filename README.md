# Hot Take Diary

Talk through your day out loud and get hot takes from three AI judges who actually know you.

**Live:** https://hot-take-diary.netlify.app

- Quick voice onboarding so the judges know your goals, habits and what motivates you
- Daily check-ins scored across Fitness, Work and Creative life, each with a mission for tomorrow
- XP, levels, streaks, a progress diary and a sticker book to keep you coming back
- Four themes: Clean Edit, Bubblegum, Arcade and Terminal

Profiles and progress live in your browser (localStorage). There are no accounts.

## Stack

React + Vite frontend, Netlify Functions in `netlify/functions/` (Claude for verdicts and onboarding, optional ElevenLabs for voice), Netlify Blobs for share links.

## Local development

```bash
npm install
npx netlify dev   # runs the frontend and functions together
```

The functions need `ANTHROPIC_API_KEY` (or Netlify AI Gateway). Voice uses the browser's speech tools unless an ElevenLabs key is set as `Elevenlabs`.
