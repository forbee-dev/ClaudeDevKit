# nextjs-frontend — Reference Material

Sections extracted from `forgebee/agents/nextjs-frontend.md` to keep the persona file under the 250-line budget. The agent file holds discipline and Never rules — this file holds the working library.

---

## App Router Directory Structure

```
app/
├── layout.tsx          # Root layout (wraps entire app)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI (Suspense boundary)
├── error.tsx           # Error boundary ('use client')
├── not-found.tsx       # 404 page
├── globals.css
├── (auth)/             # Route group (no URL segment)
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/
│   ├── layout.tsx      # Nested layout
│   ├── page.tsx
│   └── settings/
│       └── page.tsx
└── api/
    └── webhooks/
        └── route.ts    # Route Handler
```


## Server vs Client Components

```tsx
// Server Component (default — no directive needed)
// Can: fetch data, access backend, read files, import server-only
// Cannot: useState, useEffect, onClick, browser APIs
async function PostList() {
  const posts = await getPosts(); // Direct async data fetch
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}

// Client Component — add 'use client' directive
'use client';
import { useState } from 'react';

function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  );
}
```

**Rule of thumb:** Keep 'use client' as deep as possible. Only the interactive leaf needs it.


## Server Actions

```tsx
// app/posts/new/page.tsx
import { createPost } from './actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create</button>
    </form>
  );
}

// app/posts/new/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // Validate
  if (!title || !content) throw new Error('Missing fields');

  // Insert (via Supabase, Prisma, etc.)
  await db.insert({ title, content });

  revalidatePath('/posts');
  redirect('/posts');
}
```


## Supabase SSR Integration

```tsx
// lib/supabase/server.ts
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

// lib/supabase/client.ts
'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Routing rules:**
- Server Components, Route Handlers, Server Actions → `createSupabaseServer()`
- Client Components → `createSupabaseBrowser()`
- Middleware → `createServerClient` with request/response cookie handling
- NEVER import browser client in server code or vice versa


## Middleware Pattern

```tsx
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  // Protect routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```


## Environment Variables

```bash
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (never NEXT_PUBLIC_ prefix)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER expose to client
```

