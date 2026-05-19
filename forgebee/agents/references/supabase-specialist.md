# Supabase Specialist — Reference Material

Code samples and patterns referenced by `forgebee/agents/supabase-specialist.md`.
Moved here to keep the persona file under the 200-line budget (W16). The agent
file holds discipline, Never rules, and self-review — this file holds the
working library.

---

## CLI Reference

```bash
# Project lifecycle
supabase init                                    # Initialize new project
supabase start                                   # Start local containers
supabase stop                                    # Stop local containers
supabase status                                  # Show local service URLs/keys

# Migrations
supabase migration new <name>                    # Create empty migration file
supabase db reset                                # Drop + recreate from migrations + seed
supabase db push                                 # Push migrations to remote
supabase db pull                                 # Pull remote schema as migration
supabase db diff --use-migra                     # Diff local vs migration state

# Types
supabase gen types typescript --local > src/types/database.ts

# Edge Functions
supabase functions new <name>                    # Scaffold new function
supabase functions serve                         # Serve locally (hot reload)
supabase functions deploy <name>                 # Deploy to remote
supabase functions deploy --no-verify-jwt <name> # Public function (no auth)

# Secrets
supabase secrets set MY_KEY=value                # Set remote env var
supabase secrets list                            # List remote secrets

# Linking
supabase link --project-ref <ref>                # Link to remote project
```


## RLS Patterns

```sql
-- Basic: users own their data
CREATE POLICY "users_read_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Organization/team-based access
CREATE POLICY "team_members_read" ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = projects.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- Role-based via JWT custom claims
CREATE POLICY "admin_full_access" ON public.settings
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Public read, authenticated write
CREATE POLICY "public_read_posts" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "authors_write_posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
```

**Performance tip for RLS:** Avoid correlated subqueries in policies for large tables. Use JOINs or materialized views for complex access patterns. Index the columns used in policy WHERE clauses.

## Auth Integration

```sql
-- Always reference auth.users for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- Always use `SECURITY DEFINER` + `SET search_path = ''` on triggers that bypass RLS
- Reference `auth.users(id)` with `ON DELETE CASCADE` so user deletion cleans up
- Extract metadata from `raw_user_meta_data` (populated by OAuth providers)

## Client-Side Patterns

### Browser client (`@supabase/supabase-js`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Typed select with relations
const { data, error } = await supabase
  .from('posts')
  .select('id, title, profiles(display_name)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .range(0, 9);

// Single row (throws if 0 or 2+)
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Maybe single (returns null if not found)
const { data: settings } = await supabase
  .from('settings')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// Upsert
const { error } = await supabase
  .from('profiles')
  .upsert({ id: userId, display_name: name }, { onConflict: 'id' });

// RPC (call database function)
const { data } = await supabase.rpc('get_user_stats', { user_id: userId });
```

**Always:**
- Generate and use `Database` types — never `any`
- Check `error` before using `data`
- Use `.single()` vs `.maybeSingle()` intentionally
- Unsubscribe realtime channels on cleanup

### Next.js with `@supabase/ssr`

```typescript
// lib/supabase/server.ts — Server Components, Route Handlers, Server Actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        },
      },
    }
  );
}

// lib/supabase/client.ts — Client Components
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/middleware.ts — Next.js Middleware (for auth session refresh)
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  await supabase.auth.getUser(); // Refresh session
  return supabaseResponse;
}
```

**Routing rules:**
- Server Components → `createSupabaseServer()`
- Client Components → `createSupabaseBrowser()`
- Middleware → `createServerClient` with request/response cookies
- Route Handlers → `createSupabaseServer()`
- Server Actions → `createSupabaseServer()`
- Never import browser client in server code or vice versa

### Realtime

```typescript
// Subscribe to changes
const channel = supabase
  .channel('room-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
    (payload) => {
      if (payload.eventType === 'INSERT') addMessage(payload.new);
      if (payload.eventType === 'UPDATE') updateMessage(payload.new);
      if (payload.eventType === 'DELETE') removeMessage(payload.old);
    }
  )
  .subscribe();

// Presence (who's online)
const presenceChannel = supabase.channel('room-presence');
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    setOnlineUsers(Object.values(state).flat());
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  });

// Cleanup
return () => { supabase.removeChannel(channel); };
```

**Requirements for Realtime:**
- Table needs `REPLICA IDENTITY FULL` for UPDATE/DELETE payloads with full row data
- Realtime must be enabled in dashboard or `config.toml` for the table
- RLS applies to Realtime — user only receives changes they can SELECT

## Edge Functions (Deno)

```typescript
// supabase/functions/process-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Or: authenticated client from request
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json();
    // ... process

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

- Runtime is Deno — use `https://esm.sh/` or `https://cdn.jsdelivr.net` imports
- Share code via `_shared/` directory
- Use `SUPABASE_SERVICE_ROLE_KEY` for admin ops, `SUPABASE_ANON_KEY` for user-context ops
- Always return proper error responses with status codes
- Set secrets with `supabase secrets set`

## Storage

```sql
-- Create buckets in migration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf']);

-- Storage RLS: users manage own folder
CREATE POLICY "users_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

```typescript
// Upload with content type
const { error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file, {
    contentType: file.type,
    upsert: true,
  });

// Signed URL for private files
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('path/to/file.pdf', 3600);

// Image transformations (on-the-fly)
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('path/to/image.jpg', {
    transform: { width: 200, height: 200, resize: 'cover' },
  });

// List files in folder
const { data: files } = await supabase.storage
  .from('documents')
  .list(`${userId}/`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
```

## Database Functions & Extensions

```sql
-- Full-text search
ALTER TABLE posts ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX posts_fts_idx ON posts USING GIN (fts);

-- Query via PostgREST
const { data } = await supabase
  .from('posts')
  .select('*')
  .textSearch('fts', 'supabase & auth');

-- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  embedding vector(1536)
);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, similarity float)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.content, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```