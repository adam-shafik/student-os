# How AI + Tokens + Payment Work (read before building the AI features)

Build this *after* flashcards. This is the mental model for how the AI layer gets paid for.

## The simplest analogy
You're a restaurant. **Anthropic is your ingredient supplier.** The customer pays *you* for a
meal; *you* pay the supplier for ingredients. The customer never buys ingredients directly, and
never sees your supplier account.

---

## 1. Who has the AI account
**You, the developer, do.** Open an [Anthropic Console](https://console.anthropic.com) account, add
a payment method, and get a secret **API key**. Anthropic bills *your* account per token used. The
user never has an API key and never talks to Anthropic — they just use your app.

## 2. What a "token" costs you
- ~1 token ≈ 0.75 words. You pay for **both** what you send (the note, the schedule context) **and**
  what the model writes back.
- Haiku is very cheap — a small flashcard-generation request is a fraction of a cent. Sonnet costs
  more. This is why you keep context tight and use Haiku for the high-volume stuff.

## 3. The flow when a user clicks an AI button
```
User clicks "Make flashcards"
      │
      ▼
Your frontend  ──►  YOUR backend (Supabase Edge Function)   ← holds the secret key
      │                    │
      │                    ├─ 1. Is this user pro / within free quota?  (check user_profiles.plan)
      │                    ├─ 2. Call Anthropic API with YOUR key
      │                    │      └─ Anthropic charges YOUR account for the tokens
      │                    └─ 3. Return the result
      ▼
User sees flashcards
```
**Critical:** the API key lives *only* in the edge function (server side). If you ever put it in
the React frontend, it gets scraped and someone runs up your bill in hours.

## 4. How paying connects to it
Payment and AI are **two separate systems**:
- **Stripe** handles the user paying you ($4/mo). On success, Stripe sends a webhook → your edge
  function sets `plan = 'pro'` in `user_profiles`.
- Paying does **not** hand them "tokens." It just flips that flag. Your backend checks the flag
  before calling the AI — which *you* pay Anthropic for, out of the subscription money.

## 5. Why the limits exist (the economics)
You pay Anthropic per use, so an unlimited heavy user could cost more than their subscription.
Quick math: Pro at $4/mo, a user does 200 Haiku actions/month at ~$0.002 each = **$0.40 of cost →
healthy margin**. The Sonnet study-plan generator costs more per run, so you meter that one. Even
"unlimited" Pro should default to cheap models + sane rate limits to protect your margin.

## 6. Practical setup checklist
- [ ] Anthropic Console → API key → **set a monthly spend limit** so a bug can't drain you.
- [ ] Store the key as a secret in the Supabase Edge Function env (never in the frontend).
- [ ] The edge function *is* your "wrapper": auth check → quota check → model call → return.
- [ ] Add an `ai_usage` table (per-user, per-day) to enforce the free allowance and spot abuse.

That edge function + `plan` flag + `ai_usage` table is the **entire backbone**. Everything else
(flashcard generation, the assistant, the study-plan generator) is just different prompts calling
that same endpoint.

---

## Model strategy (Claude)
- **Haiku 4.5** (`claude-haiku-4-5`) — cheap/high-volume: flashcard generation, summaries, autocomplete.
- **Sonnet 4.6** (`claude-sonnet-4-6`) — the tutor + study-plan reasoning.
- Stream responses. Keep context tight (send only the relevant note/week, not everything).

## When you're ready
The first piece to build is the wrapper: a `POST /ai` Supabase Edge Function that does
auth check → plan/quota gate → Claude call → return. Every AI feature plugs into that.
