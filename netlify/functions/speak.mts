import type { Config } from '@netlify/functions'
import { PERSONALITIES, type PersonalityId } from '../../shared/domain'
import { checkRateLimit, clientIp, rateLimitedResponse } from '../../shared/rateLimit'

const elevenLabsTtsUrl = (voiceId: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
const DAILY_LIMIT = 20

export default async (req: Request) => {
  const { allowed } = await checkRateLimit('speak', clientIp(req), DAILY_LIMIT)
  if (!allowed) return rateLimitedResponse()

  const apiKey = Netlify.env.get('Elevenlabs')
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs is not configured on this deploy.' },
      { status: 501 },
    )
  }

  const { text, personality } = (await req.json()) as {
    text?: string
    personality?: PersonalityId
  }

  if (!text || !personality || !(personality in PERSONALITIES)) {
    return Response.json({ error: 'Missing "text" or valid "personality".' }, { status: 400 })
  }

  const voiceId = PERSONALITIES[personality].voiceId

  const elevenRes = await fetch(elevenLabsTtsUrl(voiceId), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
    }),
  })

  if (!elevenRes.ok || !elevenRes.body) {
    const detail = await elevenRes.text()
    console.error('ElevenLabs TTS error', elevenRes.status, detail)
    return Response.json({ error: 'Voice synthesis failed.' }, { status: 502 })
  }

  return new Response(elevenRes.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}

export const config: Config = {
  path: '/api/speak',
  method: 'POST',
}
