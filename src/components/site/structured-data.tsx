// JSON-LD structured data for SEO + AEO/GEO (answer & generative engines like
// Google AI Overviews, ChatGPT, Perplexity). Emits Organization, SoftwareApplication,
// WebSite, and FAQPage schemas so machines can quote ArrowLabs accurately.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://arrowlabs.art'

const FAQS = [
  {
    q: 'What is ArrowLabs?',
    a: 'ArrowLabs is an AI creative operating system for e-commerce. From a single Amazon ASIN or product link it automates optimized listings, ranked ad angles, product photography, and UGC video.',
  },
  {
    q: 'Is ArrowLabs fully automated?',
    a: 'Yes. ArrowLabs automates the entire creative pipeline with a team of AI agents that plan, research, write, render, and review. A human stays on the loop to approve, not in the loop doing the work. Set it and forget it.',
  },
  {
    q: 'How much does ArrowLabs cost?',
    a: 'Every plan starts with a 7-day completely free trial with unlimited generation, no credit card required. After the trial, usage runs on a shared company credit wallet with paid top-ups.',
  },
  {
    q: 'Who is ArrowLabs for?',
    a: 'Amazon and marketplace sellers, D2C brands, and agencies who need listings, ad creative, product photos, and video generated from one brand system.',
  },
  {
    q: 'What AI powers ArrowLabs?',
    a: 'ArrowLabs runs on ThreeArrow AI, an applied-AI stack for reasoning, imagery, and video generation, orchestrated as a multi-agent workflow.',
  },
]

export function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_URL}/#org`,
        name: 'ArrowLabs',
        url: APP_URL,
        logo: `${APP_URL}/logo.svg`,
        description: 'The AI creative operating system for commerce, built by ThreeArrow AI.',
        parentOrganization: {
          '@type': 'Organization',
          name: 'ThreeArrow AI',
          url: 'https://threearrowai.com',
        },
        sameAs: ['https://threearrowai.com'],
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_URL}/#website`,
        url: APP_URL,
        name: 'ArrowLabs',
        publisher: { '@id': `${APP_URL}/#org` },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'ArrowLabs',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'AI creative operating system for e-commerce that automates Amazon listings, ad angles, product photography, and UGC video from a single ASIN, with a human on the loop.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: '7-day completely free trial, unlimited generation.',
        },
        featureList: ['ListingLab', 'AngleLab', 'PhotoLab', 'VideoLab'],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}

// FAQPage schema - render ONLY on the page that shows the visible FAQ (pricing),
// per Google's guideline that FAQ markup must match on-page content.
export function FaqStructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
}
