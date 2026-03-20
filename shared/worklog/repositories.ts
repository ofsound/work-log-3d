import type { EntityId, TimeBoxInput } from './types'

export interface ProjectRepository {
  create(input: { name: string }): Promise<EntityId>
  rename(id: EntityId, name: string): Promise<void>
  remove(id: EntityId): Promise<void>
}

export interface TagRepository {
  create(input: { name: string }): Promise<EntityId>
  rename(id: EntityId, name: string): Promise<void>
  remove(id: EntityId): Promise<void>
}

export interface TimeBoxRepository {
  create(input: TimeBoxInput): Promise<EntityId>
  update(id: EntityId, input: TimeBoxInput): Promise<void>
  remove(id: EntityId): Promise<void>
}

export interface WorklogRepositories {
  projects: ProjectRepository
  tags: TagRepository
  timeBoxes: TimeBoxRepository
}
