'use client'

import { motion } from 'framer-motion'

const features = [
  {
    n: '01',
    title: 'REST API and Webhooks',
    body: 'Programmatic access to every lab. Generate assets, fetch analytics, and trigger workflows from your own stack. Webhooks fire on every state change.',
    tag: 'For developers',
  },
  {
    n: '02',
    title: 'SSO and SCIM',
    body: 'SAML 2.0, Google Workspace, and Okta out of the box. Automated user provisioning and deprovisioning via SCIM. Role-based access control per workspace.',
    tag: 'Enterprise-ready',
  },
  {
    n: '03',
    title: 'Audit logs and compliance',
    body: 'Every action is logged and exportable. SOC 2 Type II in progress. GDPR, CCPA, and HIPAA-aware data handling. Data residency options for EU and US.',
    tag: 'Security',
  },
  {
    n: '04',
    title: 'Native integrations',
    body: 'Direct push to Amazon Seller Central, Shopify, WooCommerce, Etsy. Ad export to Meta, TikTok, Google Ads, Pinterest, LinkedIn. Slack and Notion notifications.',
    tag: '20+ integrations',
  },
  {
    n: '05',
    title: 'Approval workflows',
    body: 'Multi-step review chains before any asset ships. Custom approvers per workspace, per brand, per asset type. Slack and email notifications on pending reviews.',
    tag: 'For agencies',
  },
  {
    n: '06',
    title: 'White-label and custom domain',
    body: 'Run ArrowLabs on your own domain with your branding. Agency partners get a fully white-labeled client portal. Custom domain, logo, colors, and email templates.',
    tag: 'For agencies',
  },
  {
    n: '07',
    title: 'Analytics dashboard',
    body: 'Track creative performance across every channel. ROAS, CTR, CVR, and creative fatigue scores in one view. Export to Looker, Tableau, or CSV.',
    tag: 'For performance teams',
  },
  {
    n: '08',
    title: 'Custom model training',
    body: 'Enterprise customers can fine-tune ArrowLabs models on their past winners. Your data never trains shared models. Dedicated model endpoints and VPC deployment available.',
    tag: 'Enterprise',
  },
]

export function Scale() {
  return (
    <section id="scale" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Header */}
        <div className="grid gap-8 pb-12 hairline-b lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <div className="label-mono">§ 07 · Built to scale</div>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              From your first listing
              <br />
              to your{' '}
              <span className="font-display-italic text-gradient">ten-thousandth.</span>
            </motion.h2>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              ArrowLabs is built like infrastructure, not a toy. Every feature you would
              expect from a serious SaaS platform, designed to scale from solo seller
              to enterprise marketplace.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-baseline justify-between">
                <span className="label-mono">{f.n}</span>
                <span className="text-[10px] uppercase tracking-wider text-accent">
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-medium tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {[
            { v: 'SOC 2', l: 'Type II in progress' },
            { v: 'GDPR', l: 'and CCPA compliant' },
            { v: '99.9%', l: 'Uptime SLA' },
            { v: '256-bit', l: 'Encryption at rest' },
          ].map((s) => (
            <div key={s.l} className="glass rounded-xl p-6 text-center">
              <div className="font-display text-2xl font-medium tracking-tight text-accent">
                {s.v}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
