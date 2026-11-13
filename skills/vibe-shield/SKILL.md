---
name: vibe-shield
description: Apply a six-phase defensive security review to changes affecting applications, APIs, data, AI agents, and MCP configuration. Use static evidence, preserve behavior, and report limitations.
allowed-tools: Bash(npx -y @vibefoundry/vibe-shield scan*), Bash(npx -y @vibefoundry/vibe-shield audit-skills*), Bash(npx -y @vibefoundry/vibe-shield explain*), Read(./**), Grep, Glob
license: MIT
metadata:
  author: VibeFoundry
  homepage: https://github.com/avivgerz-hue/vibe-shield
  version: 2.0.0
---

# Defensive AppSec architect protocol

Work only within the authorized project. Static findings are evidence for review, not proof of exploitability or a guarantee of safety. Do not transmit source code or secrets. Ask before changing production services, rotating credentials, or making destructive changes.

## Phase 1: Attack-surface reconnaissance

Map entrypoints and trust boundaries: API methods, authentication and authorization, middleware matchers, database tables and policies, storage, LLM inputs and tools, webhooks, and agent/MCP configuration. Check deployment configuration and exclusions. Identify what the scanner cannot see.

## Phase 2: Automated static scan and skill audit

```bash
npx -y @vibefoundry/vibe-shield scan . --format json
npx -y @vibefoundry/vibe-shield audit-skills . --format json
```

Inspect findings, inventory, ignored paths, and the files scanned. The explicit `.` includes test and documentation files: review fixtures as examples rather than blindly changing them. Use `explain <RULE_ID>` to investigate a rule. These commands run locally; first-time installation with npx requires registry access.

## Phase 3: Deep contextual threat modeling

Trace untrusted input through authentication, ownership checks and tenant boundaries to database, filesystem, network, HTML, and LLM sinks. Inspect IDOR, business-logic bypasses, webhook signature verification and asynchronous jobs. Check cross-file guards and deployed database policies; absence of a static finding is not evidence of protection.

## Phase 4: Surgical zero-regression remediation

- On Next.js mutation routes, authenticate the session on the server and authorize the target resource against the session principal before writes. Do not trust identity from request bodies.
- Enable Supabase RLS and write action-specific policies using the authenticated principal; test both permitted and denied tenants before deploying migrations.
- Validate inputs at the boundary with a schema such as Zod, then use parameterized database queries. Treat LLM output as untrusted.
- Use explicit CORS allowlists, secure cookie flags and a CSP appropriate for the application. Test login, redirects, and browser behavior.
- Report exposed credentials to the owner for provider-side rotation; avoid reproducing their values in reports. Do not suppress findings or weaken controls to obtain a higher score. Ask for missing business or deployment decisions.

### Supabase RLS and ownership policies (VSB-DB-001 / VSB-DB-002)

Adapt the table, owner column, and policy names to your schema. First inspect **all** existing policies: permissive policies are OR-combined, so one leftover `USING (true)` can still expose rows. Replace or drop each broad policy in a reviewed migration; the example only drops the named policy. Enable RLS, use a non-null `user_id` referencing `auth.users(id)`, grant only needed table privileges to `authenticated`, and test allowed and denied access for two users. Owners, service roles and `BYPASSRLS` can bypass RLS: do not use those credentials in client-facing code.

```sql
-- Example: public.documents has id and NOT NULL user_id (uuid).
BEGIN;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON public.documents;
CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
COMMIT;
```

### Next.js App Router: verified session and ownership (VSB-AUTH-001 / VSB-AUTH-004)

This example assumes your `@/lib/supabase/server` helper creates a request-scoped Supabase server client using the caller's cookies, not a service-role client. Install Zod and adapt the table and schema. Never accept `userId` or ownership from `await req.json()`: derive it from verified `getUser()`, then bind it to the database write. Use appropriate CSRF/origin protection for cookie-authenticated mutations.

```typescript
// app/api/documents/route.ts
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Input = z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200) }).strict();

export async function PATCH(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response('Unauthorized', { status: 401 });
  const userId = user.id;
  const body = Input.safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response('Invalid request', { status: 400 });
  const documentId = body.data.id;
  const { data, error } = await supabase.from('documents')
    .update({ title: body.data.title })
    .eq('id', documentId).eq('user_id', userId)
    .select('id').maybeSingle();
  if (error) return new Response('Update failed', { status: 500 });
  if (!data) return new Response('Not found', { status: 404 });
  return Response.json({ id: data.id });
}
```

### AI routes: distributed rate limits and token caps (VSB-AI-014)

`VSB-AI-001` is the existing **command injection** rule; rate limiting is `VSB-AI-014`. The example below shares one verified-user limit between `/api/chat` and `/api/completion`, rejects oversized bodies while reading, limits output tokens and times out the provider call. Install `openai`, `@upstash/redis`, `@upstash/ratelimit`, and `zod`; configure Redis and provider credentials as server-only environment variables, plus your request-scoped Supabase helper. The Redis limiter must be shared across instances and fail closed. Tune limits to the application, and separately enforce atomic per-user spending/token quotas, provider budget alerts, and an input-token/context limit using the model's tokenizer. Character and output caps alone are not a complete spend limit.

```typescript
// lib/guarded-ai.ts — reused by both routes
import 'server-only';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1 m') });
const openai = new OpenAI();
const Input = z.object({ prompt: z.string().trim().min(1).max(4000) }).strict();

async function readBody(req: Request): Promise<unknown> {
  if (!req.body) throw new Error('Missing body');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return new Response('Unauthorized', { status: 401 });
  try {
    const { success } = await limiter.limit(`ai:${user.id}`);
    if (!success) return new Response('Rate limit exceeded', { status: 429 });
  } catch { return new Response('Rate limiter unavailable', { status: 503 }); }
  let raw: unknown;
  try { raw = await readBody(req); } catch { return new Response('Invalid body', { status: 400 }); }
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return new Response('Invalid request', { status: 400 });
  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: parsed.data.prompt }],
      max_completion_tokens: 512,
    }, { signal: AbortSignal.timeout(30_000) });
    return Response.json({ text: result.choices[0]?.message.content ?? '' });
  } catch { return new Response('AI provider unavailable', { status: 502 }); }
}
```

```typescript
// app/api/chat/route.ts and app/api/completion/route.ts
export { POST } from '@/lib/guarded-ai';
```


## Phase 5: Verification gate

Run project tests and both audits again. Aim for 100/100 Grade A+ with no high or critical findings, but report any unresolved finding, exclusion, false positive, or verification limitation honestly rather than claiming success. Never equate a clean score with a complete security assessment.

```bash
npx -y @vibefoundry/vibe-shield scan --fail-on high
npx -y @vibefoundry/vibe-shield audit-skills --fail-on high
```

## Phase 6: Executive security sign-off

Produce a Markdown or HTML report with scope, inventory, risks prioritized by severity, evidence, actions, test results and remaining uncertainty. Illustrative code examples are not project-specific patches; review and adapt them. Obtain human approval before deployment or provider-side action.

```bash
npx -y @vibefoundry/vibe-shield scan --report SECURITY-REPORT.md --patch-prompt PATCH-PROMPT.md
npx -y @vibefoundry/vibe-shield audit-skills --report AGENT-REPORT.html
```
