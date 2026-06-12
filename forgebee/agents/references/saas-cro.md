# saas-cro — Reference Material

Frameworks and templates referenced by `forgebee/agents/saas-cro.md`. Moved here to keep the persona file under the 200-line budget (W16). The agent file holds discipline, Never rules, and self-review — this file holds the working library.

---

## SaaS CRO Patterns

### Pricing Page Component

```tsx
'use client';

import { useState } from 'react';

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 19,
    annualPrice: 15, // per month, billed annually
    features: ['5 projects', '10GB storage', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 39,
    features: ['Unlimited projects', '100GB storage', 'Priority support', 'API access'],
    cta: 'Start Free Trial',
    highlighted: true, // Von Restorff effect
    badge: 'Most Popular', // Social proof
  },
  {
    name: 'Enterprise',
    monthlyPrice: 149,
    annualPrice: 119,
    features: ['Everything in Pro', 'SSO', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true); // Default to annual (anchoring)

  return (
    <section>
      {/* Billing toggle — annual saves X% */}
      <div className="billing-toggle">
        <span>Monthly</span>
        <button onClick={() => setIsAnnual(!isAnnual)}>
          {isAnnual ? 'Annual' : 'Monthly'}
        </button>
        <span>Annual <span className="savings-badge">Save 20%</span></span>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            price={isAnnual ? plan.annualPrice : plan.monthlyPrice}
            isAnnual={isAnnual}
          />
        ))}
      </div>

      {/* Risk reversal */}
      <p className="guarantee">
        14-day free trial. No credit card required. Cancel anytime.
      </p>
    </section>
  );
}
```

### Multi-Step Signup Form

```tsx
'use client';

import { useState } from 'react';

const STEPS = ['Account', 'Profile', 'Workspace'] as const;

export function SignupFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ email: '', name: '', workspace: '' });

  // Progressive disclosure — only show one step at a time
  // Reduces cognitive load (Hick's Law)
  return (
    <div className="signup-flow">
      {/* Progress indicator — commitment/consistency principle */}
      <div className="progress-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={i <= step ? 'active' : ''}>
            {i < step ? '✓' : i + 1} {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="step">
          <h2>Create your account</h2>
          <p className="social-proof">Join 10,000+ teams already using Product</p>
          <input
            type="email"
            placeholder="work@company.com"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            autoFocus
          />
          {/* Low-friction first step — email only */}
          <button onClick={() => setStep(1)}>Continue</button>
          <p className="micro-copy">No credit card required</p>
        </div>
      )}

      {step === 1 && (
        <div className="step">
          <h2>Tell us about yourself</h2>
          <input
            type="text"
            placeholder="Your name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            autoFocus
          />
          <button onClick={() => setStep(2)}>Continue</button>
          <button onClick={() => setStep(0)} className="back">Back</button>
        </div>
      )}

      {step === 2 && (
        <div className="step">
          <h2>Name your workspace</h2>
          <input
            type="text"
            placeholder="Acme Inc"
            value={data.workspace}
            onChange={(e) => setData({ ...data, workspace: e.target.value })}
            autoFocus
          />
          <button onClick={() => handleSubmit(data)}>Create Workspace</button>
          <button onClick={() => setStep(1)} className="back">Back</button>
        </div>
      )}
    </div>
  );
}
```

### Social Proof Components

```tsx
// Real-time social proof ticker
export function SocialProofTicker({ recentSignups }: { recentSignups: Signup[] }) {
  return (
    <div className="social-proof-ticker">
      {recentSignups.slice(0, 3).map((signup) => (
        <div key={signup.id} className="ticker-item">
          <img src={signup.avatar} alt="" className="avatar" />
          <span>
            <strong>{signup.name}</strong> from {signup.company} just signed up
          </span>
          <time>{formatTimeAgo(signup.createdAt)}</time>
        </div>
      ))}
    </div>
  );
}

// Logo wall with trust signal
export function LogoWall({ logos }: { logos: Logo[] }) {
  return (
    <section className="logo-wall">
      <p>Trusted by {logos.length * 100}+ companies worldwide</p>
      <div className="logos-grid">
        {logos.map((logo) => (
          <img key={logo.name} src={logo.src} alt={logo.name} />
        ))}
      </div>
    </section>
  );
}

// Metrics bar
export function MetricsBar() {
  return (
    <div className="metrics-bar">
      <div><strong>10,000+</strong><span>Teams</span></div>
      <div><strong>99.9%</strong><span>Uptime</span></div>
      <div><strong>4.8/5</strong><span>Rating</span></div>
      <div><strong>&lt;2min</strong><span>Setup</span></div>
    </div>
  );
}
```

### A/B Testing Pattern (Feature Flags)

```tsx
// Simple feature flag-based A/B testing
export function ABTest({
  experimentId,
  control,
  variant,
}: {
  experimentId: string;
  control: React.ReactNode;
  variant: React.ReactNode;
}) {
  const [isVariant] = useState(() => {
    // Deterministic based on user/session
    const stored = typeof window !== 'undefined'
      ? sessionStorage.getItem(`ab_${experimentId}`)
      : null;
    if (stored) return stored === 'variant';
    const assignment = Math.random() > 0.5 ? 'variant' : 'control';
    sessionStorage.setItem(`ab_${experimentId}`, assignment);
    // Track assignment
    trackEvent('ab_assignment', { experimentId, variant: assignment });
    return assignment === 'variant';
  });

  return <>{isVariant ? variant : control}</>;
}

// Usage
<ABTest
  experimentId="hero-headline-v2"
  control={<h1>Build faster with Product</h1>}
  variant={<h1>Ship 10x faster — no compromises</h1>}
/>
```

### Exit Intent Modal

```tsx
'use client';

import { useEffect, useState } from 'react';

export function ExitIntentModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10 && !sessionStorage.getItem('exit_shown')) {
        setShow(true);
        sessionStorage.setItem('exit_shown', '1');
      }
    };
    document.addEventListener('mouseout', handler);
    return () => document.removeEventListener('mouseout', handler);
  }, []);

  if (!show) return null;

  return (
    <div className="exit-modal-overlay" onClick={() => setShow(false)}>
      <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Wait — try it free for 14 days</h2>
        <p>No credit card required. Cancel anytime.</p>
        <input type="email" placeholder="your@email.com" autoFocus />
        <button>Start Free Trial</button>
        <button onClick={() => setShow(false)} className="dismiss">
          No thanks
        </button>
      </div>
    </div>
  );
}
```

