'use client'

import { motion } from 'framer-motion'

const faqs = [
  {
    q: 'What makes ArrowLabs different from generic AI image tools?',
    a: 'Generic tools generate images from a single prompt with no context. ArrowLabs is built specifically for e-commerce: it scans your reviews, competitors, and search data, then generates creatives engineered around real buyer psychology. It also pushes directly to Seller Central, Meta, and TikTok.',
  },
  {
    q: 'Do I need design or Photoshop skills?',
    a: 'No. If you can paste an Amazon URL or upload a product photo, you can use ArrowLabs. Every lab produces ready-to-ship assets in your brand colors and fonts, with optional manual editing for power users.',
  },
  {
    q: 'Which marketplaces and ad platforms do you support?',
    a: 'ListingLab pushes to Amazon Seller Central (US, CA, MX, UK, EU, IN, AU, JP), Shopify, WooCommerce, and Etsy. AngleLab and VideoLab export to Meta, TikTok, Google Ads, YouTube Shorts, Pinterest, and LinkedIn, in the correct sizes for each placement.',
  },
  {
    q: 'How does the multi-agent workflow actually work?',
    a: 'Six specialized AI agents run in sequence: an AI CMO sets strategy, an AI Strategist surfaces ranked angles, a Copywriting Agent writes on-brand copy, a VideoLab Agent assembles video, a Brand Brain keeps everything on-brand, and an optional Human Review step QA’s the output before it ships.',
  },
  {
    q: 'Can I bring my own brand guidelines?',
    a: 'Yes. Upload your fonts, color palette, logo, tone-of-voice samples, and past winning creatives. ArrowLabs’s Brand Brain memorizes them and applies them across every asset, so an entire campaign looks like it came from one studio.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Starter plan is free forever, 1 campaign and 25 image generations per month, no credit card required. Upgrade, downgrade, or cancel anytime.',
  },
  {
    q: 'Do you support agencies with multiple clients?',
    a: 'The Agency plan includes 20 team seats, 100 GB storage, white-label client workspaces, custom brand brains per client, and a dedicated account manager. Many of our largest accounts are Amazon agencies running 10 to 30 brands through a single ArrowLabs workspace.',
  },
  {
    q: 'How is my data handled?',
    a: 'Your product data, brand assets, and generated creatives are stored encrypted at rest and in transit. We never train shared models on your private data, and you can delete your data and account at any time. SOC 2 Type II audit is in progress.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-32 bg-muted/30 hairline-t hairline-b">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 12 · Questions</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Questions,
              <br />
              <span className="font-display-italic text-gradient">answered.</span>
            </motion.h2>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 2) * 0.08 }}
              className="hairline-b pb-6"
            >
              <div className="flex gap-4">
                <span className="label-mono shrink-0 tabular">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
                    {faq.q}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Still stuck? We respond to every email within a few hours.
          </p>
          <a
            href="#cta"
            className="text-sm font-medium text-foreground link-underline"
          >
            Talk to our team →
          </a>
        </div>
      </div>
    </section>
  )
}
