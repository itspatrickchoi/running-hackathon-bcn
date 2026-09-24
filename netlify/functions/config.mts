import type { Config } from '@netlify/functions'

export default async () => {
  return Response.json({
    elevenLabsConfigured: Netlify.env.has('Elevenlabs'),
  })
}

export const config: Config = {
  path: '/api/config',
}
