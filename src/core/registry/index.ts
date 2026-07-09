// The typed registries, one per stage. A module registers by calling the matching
// helper (registerScraper, registerGenerator, ...) at import time. The pipeline
// only ever talks to these registries, never to concrete modules.

import type { Generator } from '../contracts/generate'
import type { IntelligenceBuilder } from '../contracts/intelligence'
import type { PlatformSpec } from '../contracts/platform'
import type { Publisher } from '../contracts/publish'
import type { ScrapeProvider } from '../contracts/scrape'
import type { Validator } from '../contracts/validate'
import { Registry } from './registry'

export const scrapers = new Registry<ScrapeProvider>('scrapers')
export const intelligence = new Registry<IntelligenceBuilder>('intelligence')
export const generators = new Registry<Generator>('generators')
export const validators = new Registry<Validator>('validators')
export const publishers = new Registry<Publisher>('publishers')

// Platforms are data, so they get their own registry keyed by platform key.
// We wrap each spec so it satisfies the Registrable { id } shape.
interface PlatformEntry {
  id: string
  spec: PlatformSpec
}
const platformRegistry = new Registry<PlatformEntry>('platforms')

export function registerScraper(p: ScrapeProvider): ScrapeProvider {
  return scrapers.register(p)
}
export function registerIntelligence(b: IntelligenceBuilder): IntelligenceBuilder {
  return intelligence.register(b)
}
export function registerGenerator(g: Generator): Generator {
  return generators.register(g)
}
export function registerValidator(v: Validator): Validator {
  return validators.register(v)
}
export function registerPublisher(p: Publisher): Publisher {
  return publishers.register(p)
}
export function registerPlatform(spec: PlatformSpec): PlatformSpec {
  platformRegistry.register({ id: spec.key, spec })
  return spec
}
export function getPlatform(key: string): PlatformSpec {
  return platformRegistry.require(key).spec
}
export function allPlatforms(): PlatformSpec[] {
  return platformRegistry.all().map((e) => e.spec)
}

export { Registry } from './registry'
