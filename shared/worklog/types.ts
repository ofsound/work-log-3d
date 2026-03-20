export type EntityId = string

export interface Project {
  id: EntityId
  name: string
  slug: string
}

export interface Tag {
  id: EntityId
  name: string
  slug: string
}

export interface TimeBox {
  id: EntityId
  startTime: Date | null
  endTime: Date | null
  notes: string
  project: EntityId
  tags: EntityId[]
}

export interface TimeBoxInput {
  startTime: Date
  endTime: Date
  notes: string
  project: EntityId
  tags: EntityId[]
}

export interface NamedEntity {
  id: EntityId
  name: string
}

export type SortDirection = 'asc' | 'desc'
