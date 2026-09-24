import type { Config } from '@netlify/functions'
import { checkRateLimit, clientIp, rateLimitedResponse } from '../../shared/rateLimit'

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text'
const DAILY_LIMIT = 20

export default async (req: Request) => {
  const { allowed } = await checkRateLimit('transcribe', clientIp(req), DAILY_LIMIT)
  if (!allowed) return rateLimitedResponse()

  const apiKey = Netlify.env.get('Elevenlabs')
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs is not configured on this deploy.' },
      { status: 501 },
    )
  }

  const incoming = await req.formData()
  const audio = incoming.get('audio')
  if (!(audio instanceof Blob)) {
    return Response.json({ error: 'Missing "audio" file in request.' }, { status: 400 })
  }

  const outgoing = new FormData()
  outgoing.set('model_id', 'scribe_v1')
  outgoing.set('file', audio, 'recording.webm')

  const elevenRes = await fetch(ELEVENLABS_STT_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: outgoing,
  })

  if (!elevenRes.ok) {
    const detail = await elevenRes.text()
    console.error('ElevenLabs STT error', elevenRes.status, detail)
    return Response.json({ error: 'Transcription failed.' }, { status: 502 })
  }

  const data = (await elevenRes.json()) as { text?: string }
  return Response.json({ transcript: data.text ?? '' })
}

export const config: Config = {
  path: '/api/transcribe',
  method: 'POST',
}
