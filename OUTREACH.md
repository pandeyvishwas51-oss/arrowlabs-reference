# ArrowLabs - Pitch Outreach Kit

Sample creatives were generated for each brand (in `public/marketing/pitch/`). Use
them as the hook: "We made these for you in 90 seconds. Imagine your whole catalog."

> Emails below are best-effort (contact pages + common patterns). Verify a decision
> maker on LinkedIn before sending. Do NOT mass-mail unverified addresses.

| Brand | Category | Route | Likely email | Decision maker | Assets |
|---|---|---|---|---|---|
| Snitch | Mens fashion | snitch.com/contact-us · LinkedIn (97k) | hello@snitch.com | Siddharth Dungarwal (Founder) | snitch-hero, snitch-life, ugc-fashion |
| The Whole Truth | Healthy food | thewholetruthfoods.com/pages/contact-us | hello@thewholetruthfoods.com (pattern first@) | Samarth Bansal (Head of Content) | thewholetruth-hero/life, ugc-food |
| Minimalist | Skincare | beminimalist.co / contact | support@beminimalist.co | Mohit/Rahul Yadav (Founders) | minimalist-hero/life, ugc-skincare |
| Peeko | Baby & kids | via Instagram DM + site contact | hello@ (verify) | - | peeko-hero/life |
| SuperBottoms | Baby care | superbottoms.com/pages/contact | care@superbottoms.com | Pallavi Utagi (Founder) | superbottoms-hero/life |
| Pilgrim | Beauty | discoverpilgrim.com / contact | support@discoverpilgrim.com | Anurag Kedia (Founder) | pilgrim-hero/life |
| Wakao Foods | Plant-based | wakaofoods.com / contact | hello@wakaofoods.com | Sairaj Dhond (Founder) | wakao-hero/life |
| The Sleep Company | Home & sleep | thesleepcompany.in / contact | care@thesleepcompany.in | Priyanka Salot (Co-founder) | sleepcompany-hero/life |

## Cold email template

> Subject: Made your next campaign (in 90 seconds)
>
> Hi {name},
>
> We're ArrowLabs. From a single product link we generate listings, A+ content,
> ad creative, and UGC video, all in your brand's look.
>
> We made a few sample {brand} creatives to show you what it does: {link}.
> No stock, no shoot, one prompt.
>
> If you like them, we'll build your whole catalog on a free 15-day trial.
> 15 mins this week?
>
> - {your name}, ArrowLabs

## Recommended flow (build later, optional)
1. `/api/outreach` route: pick brand -> generate 3 sample creatives -> upload -> send via Resend.
2. Track opens/clicks in the Event table (already exists) as `type: 'outreach'`.
