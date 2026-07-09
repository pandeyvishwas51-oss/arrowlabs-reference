// Engine bootstrap. Platform specs register themselves at import (they are pure
// data). Behavior modules that depend on services register here, once, when the
// app starts and the services are available.
//
//   import { configureEngine } from '@/core'
//   configureEngine({ aiText, aiVision, brandStore, keywordProvider })
//
// Calling it more than once is safe: the registries reject duplicate ids, so a
// second call throws loudly rather than silently double-registering.

import { createBrandBuilder } from './modules/intelligence/brand'
import { createNodeBuilder } from './modules/intelligence/node'
import { createBrandValidator } from './modules/validators/brand'
import { createComplianceValidator } from './modules/validators/compliance'
import { createMobileValidator } from './modules/validators/mobile'
import { createVisionValidator } from './modules/validators/vision'
import {
  generators,
  intelligence,
  publishers,
  registerIntelligence,
  registerValidator,
  scrapers,
  validators,
} from './registry'
import type { Services } from './contracts/services'

let configured = false

export function configureEngine(services: Services = {}): void {
  if (configured) return
  configured = true

  // Intelligence builders
  registerIntelligence(createBrandBuilder({ brandStore: services.brandStore }))
  registerIntelligence(
    createNodeBuilder({ keywordProvider: services.keywordProvider, bestSellerProvider: services.bestSellerProvider }),
  )

  // Validators (the self-critique loop). Pure ones need no services; the vision
  // check takes the vision port and degrades to a pass when it is absent.
  registerValidator(createComplianceValidator())
  registerValidator(createMobileValidator())
  registerValidator(createBrandValidator())
  registerValidator(createVisionValidator({ aiVision: services.aiVision }))
}

/** Test helper: clear all behavior-module registrations (not the data platform specs)
 *  so a fresh scenario can register its own modules and configureEngine can run again. */
export function _resetEngineForTests(): void {
  scrapers.clear()
  generators.clear()
  publishers.clear()
  intelligence.clear()
  validators.clear()
  configured = false
}
