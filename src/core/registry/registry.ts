// A tiny, generic registry. Every stage keeps one of these. Modules self-register
// their instance under a string id at import time, and the pipeline asks the
// registry what is available. This is the single mechanism behind the promise
// that adding a feature never means editing the pipeline.

export interface Registrable {
  id: string
}

export class Registry<T extends Registrable> {
  private readonly items = new Map<string, T>()

  constructor(private readonly label: string) {}

  /** Register a module. Throws on duplicate id, since a silent overwrite would be a bug. */
  register(item: T): T {
    if (this.items.has(item.id)) {
      throw new Error(`${this.label}: duplicate registration for "${item.id}"`)
    }
    this.items.set(item.id, item)
    return item
  }

  get(id: string): T | undefined {
    return this.items.get(id)
  }

  /** Get by id or throw a clear error listing what is available. */
  require(id: string): T {
    const item = this.items.get(id)
    if (!item) {
      throw new Error(`${this.label}: no module "${id}". Registered: ${this.ids().join(', ') || '(none)'}`)
    }
    return item
  }

  all(): T[] {
    return [...this.items.values()]
  }

  /** All modules matching a predicate, e.g. every validator that appliesTo a kind. */
  where(predicate: (item: T) => boolean): T[] {
    return this.all().filter(predicate)
  }

  /** The first module matching a predicate, e.g. the scraper that supports() a source. */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.all().find(predicate)
  }

  ids(): string[] {
    return [...this.items.keys()]
  }

  has(id: string): boolean {
    return this.items.has(id)
  }

  /** Remove all registrations. Intended for tests and controlled re-bootstrap. */
  clear(): void {
    this.items.clear()
  }
}
