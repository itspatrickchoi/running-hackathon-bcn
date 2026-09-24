import type { Config } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import {
  CATEGORIES,
  PERSONALITIES,
  type CategoryId,
  type Mission,
  type MissionResult,
  type PersonalityId,
  type ProfileContext,
  type Verdict,
} from '../../shared/domain'

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export default async (req: Request) => {
  if (!Netlify.env.has('ANTHROPIC_API_KEY')) {
    console.error(
      'ANTHROPIC_API_KEY is not available at runtime. Enable AI Gateway ("Build with AI") for this project, or add an ANTHROPIC_API_KEY environment variable.',
    )
    return Response.json(
      {
        error:
          'The AI classifier is not configured for this deploy yet. Enable AI Gateway in the project settings, or add an Anthropic API key.',
      },
      { status: 501 },
    )
  }

  const { transcript, assignments, profile, previousMissions } = (await req.json()) as {
    transcript?: string
    assignments?: Record<CategoryId, PersonalityId>
    profile?: ProfileContext
    previousMissions?: Mission[]
  }

  if (!transcript || transcript.trim().length < 8) {
    return Response.json({ error: 'Transcript is too short to work with.' }, { status: 400 })
  }
  if (!assignments) {
    return Response.json({ error: 'Missing personality assignments.' }, { status: 400 })
  }

  const categoryBriefs = CATEGORIES.map((c) => {
    const personality = PERSONALITIES[assignments[c.id]]
    return `- id "${c.id}" (${c.label}, covers: ${c.hint}) → voiced by ${personality.label}: ${personality.systemPrompt}`
  }).join('\n')

  const missions = (previousMissions ?? []).filter((m) => CATEGORY_IDS.includes(m.category) && m.mission)

  const profileBrief = profile?.name
    ? `\n\nWho you're talking to: ${profile.name}.${profile.dossier ? ` What you know about them:\n${profile.dossier}` : ''}\nUse what you know to make verdicts personal (their goals, habits, what motivates them) — but only where it connects to what they said today.`
    : ''

  const missionBrief = missions.length
    ? `\n\nYesterday's missions they were given:\n${missions.map((m) => `- ${m.category}: ${m.mission}`).join('\n')}\nFor each of these, judge from today's transcript whether they did it. If the transcript doesn't mention it, it counts as not completed.`
    : ''

  const anthropic = new Anthropic()
  let message
  try {
    message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      // Sonnet 5 runs adaptive thinking by default, and thinking tokens count
      // against max_tokens — the forced tool call was getting cut off mid-output.
      // This is a single forced tool call, so thinking isn't needed.
      thinking: { type: 'disabled' },
      system:
        'You classify a spoken daily recap into a fixed set of life categories, then write a short in-character verdict for each category that is actually present in the transcript. Only include a category if the person actually talked about something in it — never invent content. Ground every verdict in something the person specifically said. Each verdict also gets an honest 1–10 score for how the day went in that category, and one small, concrete mission for tomorrow, written in the same personality voice.',
      messages: [
        {
          role: 'user',
          content: `Here are the only categories allowed, each with the personality that must voice its verdict:\n${categoryBriefs}${profileBrief}${missionBrief}\n\nTranscript of the person's spoken day recap:\n"""\n${transcript}\n"""\n\nUse the submit_verdicts tool to respond.`,
        },
      ],
      tools: [
        {
          name: 'submit_verdicts',
          description: 'Submit the classified categories with their in-character verdicts.',
          input_schema: {
            type: 'object',
            properties: {
              verdicts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string', enum: CATEGORY_IDS },
                    excerpt: {
                      type: 'string',
                      description: 'A short paraphrase or quote from the transcript this verdict is grounded in.',
                    },
                    verdict: {
                      type: 'string',
                      description: "The personality's in-character verdict, 2 to 4 sentences.",
                    },
                    score: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 10,
                      description: 'How the day went in this category, 1 (disaster) to 10 (perfect).',
                    },
                    mission: {
                      type: 'string',
                      description:
                        "One small, concrete, doable-tomorrow mission for this category, under 15 words, in the personality's voice.",
                    },
                  },
                  required: ['category', 'excerpt', 'verdict', 'score', 'mission'],
                },
              },
              missionResults: {
                type: 'array',
                description: "One entry per mission from yesterday. Empty if there were none.",
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string', enum: CATEGORY_IDS },
                    completed: { type: 'boolean' },
                    note: {
                      type: 'string',
                      description: 'One short, in-character sentence about whether they did it.',
                    },
                  },
                  required: ['category', 'completed', 'note'],
                },
              },
            },
            required: ['verdicts', 'missionResults'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_verdicts' },
    })
  } catch (err) {
    console.error('Anthropic call failed', err)
    return Response.json({ error: 'The AI classifier failed to respond. Please try again.' }, { status: 502 })
  }

  if (message.stop_reason === 'max_tokens') {
    console.error('Anthropic response was truncated at max_tokens', message.usage)
    return Response.json({ error: 'The verdict was cut off. Please try a shorter recap.' }, { status: 502 })
  }

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    console.error('No tool_use block in response', message.stop_reason, message.content)
    return Response.json({ error: 'Model did not return a verdict.' }, { status: 502 })
  }

  const raw = toolUse.input as {
    verdicts?: Array<{ category: CategoryId; excerpt: string; verdict: string; score?: number; mission?: string }>
    missionResults?: MissionResult[]
  }
  if (!Array.isArray(raw?.verdicts)) {
    console.error('Malformed tool input', toolUse.input)
    return Response.json({ error: 'Model did not return a verdict.' }, { status: 502 })
  }

  const verdicts: Verdict[] = raw.verdicts
    .filter((v) => v && CATEGORY_IDS.includes(v.category) && v.verdict)
    .map((v) => ({
      category: v.category,
      personality: assignments[v.category],
      excerpt: v.excerpt,
      verdict: v.verdict,
      score: typeof v.score === 'number' ? Math.min(10, Math.max(1, Math.round(v.score))) : undefined,
      mission: v.mission || undefined,
    }))

  const missionCategories = new Set(missions.map((m) => m.category))
  const missionResults: MissionResult[] = (Array.isArray(raw.missionResults) ? raw.missionResults : [])
    .filter((r) => r && missionCategories.has(r.category))
    .map((r) => ({ category: r.category, completed: Boolean(r.completed), note: r.note ?? '' }))

  return Response.json({ verdicts, missionResults })
}

export const config: Config = {
  path: '/api/verdicts',
  method: 'POST',
}
