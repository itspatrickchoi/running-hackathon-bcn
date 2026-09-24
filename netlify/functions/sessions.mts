import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { RoastSession } from '../../shared/domain'

const SESSION_STORE = 'roast-sessions'

function makeId() {
  return crypto.randomUUID().slice(0, 8)
}

export default async (req: Request, context: Context) => {
  const store = getStore(SESSION_STORE)

  if (req.method === 'POST') {
    const body = (await req.json()) as Omit<RoastSession, 'id' | 'createdAt'>
    if (!body.transcript || !Array.isArray(body.verdicts)) {
      return Response.json({ error: 'Invalid session payload.' }, { status: 400 })
    }

    const id = makeId()
    const session: RoastSession = {
      id,
      createdAt: new Date().toISOString(),
      transcript: body.transcript,
      verdicts: body.verdicts,
    }
    await store.setJSON(id, session)
    return Response.json({ id })
  }

  if (req.method === 'GET') {
    const id = context.params.id
    if (!id) {
      return Response.json({ error: 'Missing session id.' }, { status: 400 })
    }
    const session = await store.get(id, { type: 'json' })
    return Response.json({ found: Boolean(session), session })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: Config = {
  path: ['/api/sessions', '/api/sessions/:id'],
  method: ['GET', 'POST'],
}
