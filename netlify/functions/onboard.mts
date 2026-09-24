import type { Config } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import type { OnboardingAnswer, OnboardResult } from '../../shared/domain'

export default async (req: Request) => {
  if (!Netlify.env.has('ANTHROPIC_API_KEY')) {
    console.error(
      'ANTHROPIC_API_KEY is not available at runtime. Enable AI Gateway ("Build with AI") for this project, or add an ANTHROPIC_API_KEY environment variable.',
    )
    return Response.json(
      {
        error:
          'The AI is not configured for this deploy yet. Enable AI Gateway in the project settings, or add an Anthropic API key.',
      },
      { status: 501 },
    )
  }

  const { name, answers } = (await req.json()) as { name?: string; answers?: OnboardingAnswer[] }

  if (!name || !name.trim()) {
    return Response.json({ error: 'Missing name.' }, { status: 400 })
  }
  const answered = (answers ?? []).filter((a) => a?.answer?.trim())
  if (answered.length === 0) {
    return Response.json({ error: 'Answer at least one question so the roasters have something to go on.' }, { status: 400 })
  }

  const qa = answered.map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`).join('\n\n')

  const anthropic = new Anthropic()
  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      // Single forced tool call; see verdicts.mts for why thinking is off.
      thinking: { type: 'disabled' },
      system:
        'You are building a short private file on a new user of "Roast My Day", an app where AI personalities judge their daily recaps across fitness, work and creative life. From their onboarding answers, write a compact dossier the roasters will read before every verdict, and a playful first-impression roast. Only use what they actually said — never invent facts.',
      messages: [
        {
          role: 'user',
          content: `Name: ${name.trim()}\n\nTheir onboarding answers:\n${qa}\n\nUse the submit_dossier tool to respond.`,
        },
      ],
      tools: [
        {
          name: 'submit_dossier',
          description: 'Submit the dossier and first-impression roast.',
          input_schema: {
            type: 'object',
            properties: {
              dossier: {
                type: 'string',
                description:
                  'Third-person notes for the roasters, 3 to 5 short sentences: goals, current life situation, habits, what motivates them, soft spots to poke (gently).',
              },
              firstImpression: {
                type: 'string',
                description: 'A witty, affectionate one- or two-sentence first-impression roast, addressed to them directly.',
              },
            },
            required: ['dossier', 'firstImpression'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_dossier' },
    })
  } catch (err) {
    console.error('Anthropic call failed', err)
    return Response.json({ error: 'The AI failed to respond. Please try again.' }, { status: 502 })
  }

  if (message.stop_reason === 'max_tokens') {
    console.error('Anthropic response was truncated at max_tokens', message.usage)
    return Response.json({ error: 'The AI got cut off. Please try again.' }, { status: 502 })
  }

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  const raw = (toolUse?.type === 'tool_use' ? toolUse.input : null) as Partial<OnboardResult> | null
  if (!raw?.dossier || !raw.firstImpression) {
    console.error('Malformed dossier response', message.stop_reason, message.content)
    return Response.json({ error: 'The AI did not return a profile.' }, { status: 502 })
  }

  const result: OnboardResult = { dossier: raw.dossier, firstImpression: raw.firstImpression }
  return Response.json(result)
}

export const config: Config = {
  path: '/api/onboard',
  method: 'POST',
}
