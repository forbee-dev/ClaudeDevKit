# nextjs-seo — Reference Material

Frameworks and templates referenced by `forgebee/agents/nextjs-seo.md`. Moved here to keep the persona file under the 200-line budget (W16). The agent file holds discipline, Never rules, and self-review — this file holds the working library.

---

## App Router SEO Patterns

### Static Metadata

```tsx
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Company Name',
  description: 'Learn about our mission and team.',
  openGraph: {
    title: 'About Us | Company Name',
    description: 'Learn about our mission and team.',
    type: 'website',
    url: 'https://example.com/about',
    images: [{ url: '/og/about.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Company Name',
  },
  alternates: {
    canonical: 'https://example.com/about',
  },
};
```

### Dynamic Metadata

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    title: `${post.title} | Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://example.com/blog/${slug}`,
    },
  };
}
```

### Layout Metadata (inherited)

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'Company Name',
    template: '%s | Company Name',  // Child pages inherit template
  },
  description: 'Default site description.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
```

### Dynamic Sitemap

```tsx
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const products = await getAllProducts();

  const blogEntries = posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const productEntries = products.map((product) => ({
    url: `https://example.com/products/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    { url: 'https://example.com', lastModified: new Date(), priority: 1.0 },
    { url: 'https://example.com/about', lastModified: new Date(), priority: 0.5 },
    ...blogEntries,
    ...productEntries,
  ];
}
```

### Dynamic Robots

```tsx
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/private/'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  };
}
```

### OG Image Generation

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Blog post cover';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 20 }}>Blog</div>
        <div style={{ textAlign: 'center', lineHeight: 1.3 }}>{post.title}</div>
      </div>
    ),
    { ...size }
  );
}
```

### JSON-LD Structured Data

```tsx
// components/json-ld.tsx
export function ArticleJsonLd({
  title, description, publishedTime, author, url, image,
}: {
  title: string; description: string; publishedTime: string;
  author: string; url: string; image: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedTime,
    author: { '@type': 'Person', name: author },
    url,
    image,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Usage in page.tsx (Server Component)
export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug);

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        publishedTime={post.publishedAt}
        author={post.author.name}
        url={`https://example.com/blog/${post.slug}`}
        image={post.coverImage}
      />
      <article>{/* ... */}</article>
    </>
  );
}
```

### Canonical URLs with Alternates

```tsx
// For internationalized routes
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://example.com/about',
    languages: {
      'en-US': 'https://example.com/en-us/about',
      'pt-BR': 'https://example.com/pt-br/about',
    },
  },
};
```

## Pages Router Patterns

```tsx
// pages/blog/[slug].tsx
import { NextSeo, ArticleJsonLd } from 'next-seo';

export default function BlogPost({ post }) {
  return (
    <>
      <NextSeo
        title={`${post.title} | Blog`}
        description={post.excerpt}
        canonical={`https://example.com/blog/${post.slug}`}
        openGraph={{
          title: post.title,
          description: post.excerpt,
          type: 'article',
          article: { publishedTime: post.publishedAt },
          images: [{ url: post.coverImage, width: 1200, height: 630 }],
        }}
      />
      <ArticleJsonLd
        title={post.title}
        datePublished={post.publishedAt}
        authorName={post.author.name}
        description={post.excerpt}
      />
      <article>{/* ... */}</article>
    </>
  );
}

// pages/sitemap.xml.tsx
export async function getServerSideProps({ res }) {
  const posts = await getAllPosts();
  const sitemap = generateSitemap(posts);
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();
  return { props: {} };
}
```

