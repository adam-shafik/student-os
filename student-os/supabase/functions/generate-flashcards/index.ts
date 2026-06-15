import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_MATERIAL_CHARS = 60_000
const MAX_CARDS = 25

const outputSchema = {
  type: 'object',
  properties: {
    suitable: {
      type: 'boolean',
      description: 'Whether the material contains real study content that flashcards can be made from',
    },
    reason: {
      type: 'string',
      description: 'If not suitable, a short user-facing explanation why. Empty string when suitable.',
    },
    cards: {
      type: 'array',
      description: 'The generated flashcards. Empty when not suitable.',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string', description: 'Question, term, or prompt' },
          back: { type: 'string', description: 'Answer or definition' },
        },
        required: ['front', 'back'],
        additionalProperties: false,
      },
    },
  },
  required: ['suitable', 'reason', 'cards'],
  additionalProperties: false,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { material, deckTitle, domainName, academicWeek } = await req.json()

    if (!material || typeof material !== 'string' || material.trim().length < 100) {
      return new Response(
        JSON.stringify({ suitable: false, reason: 'Not enough material to generate flashcards from.', cards: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const context = [
      deckTitle ? `Deck: ${deckTitle}` : null,
      domainName ? `Course/domain: ${domainName}` : null,
      academicWeek ? `Academic week: ${academicWeek}` : null,
    ].filter(Boolean).join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      system: `You generate study flashcards from material a university student provides.

First judge the material: it must contain actual study content (lecture notes, textbook excerpts, definitions, concepts, problems). If it is gibberish, a shopping list, casual chatter, or otherwise not study material, set suitable=false with a short friendly reason and return no cards.

When suitable, generate as many flashcards as the material genuinely supports — no filler or padding questions. Hard cap: ${MAX_CARDS} cards. Rules:
- Write cards in the same language as the material.
- Fronts are a single clear question, term, or prompt. Backs are the answer or definition — keep answers to one or two sentences.
- Each card must be self-contained — understandable without seeing the source material.
- Prefer understanding over rote trivia: definitions, why/how questions, contrasts, applications.
- Never invent facts not supported by the material.`,
      messages: [{
        role: 'user',
        content: `${context ? context + '\n\n' : ''}Material:\n\n${material.slice(0, MAX_MATERIAL_CHARS)}`,
      }],
      output_config: { format: { type: 'json_schema', schema: outputSchema } },
    })

    const block = response.content.find((b) => b.type === 'text')
    const result = JSON.parse(block?.text ?? '{}')
    if (Array.isArray(result.cards)) result.cards = result.cards.slice(0, MAX_CARDS)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-flashcards failed:', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
