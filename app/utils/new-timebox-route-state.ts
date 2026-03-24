export interface NewTimeBoxRoutePrefill {
  project: string
  tags: string[]
}

export interface NewTimeBoxRoutePrefillOptions {
  validProjectIds?: readonly string[]
  validTagIds?: readonly string[]
}

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const getListQueryIds = (value: string | string[] | undefined) =>
  Array.from(
    new Set(
      (getSingleQueryValue(value) ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )

const filterKnownIds = (ids: readonly string[], validIds: readonly string[] | undefined) => {
  if (!validIds?.length) {
    return [...ids]
  }

  const knownIds = new Set(validIds)

  return ids.filter((id) => knownIds.has(id))
}

export const parseNewTimeBoxRoutePrefill = (
  query: Record<string, string | string[] | undefined>,
  options: NewTimeBoxRoutePrefillOptions = {},
): NewTimeBoxRoutePrefill => {
  const project = getSingleQueryValue(query.project)?.trim() ?? ''
  const tags = getListQueryIds(query.tags)

  return {
    project: filterKnownIds(project ? [project] : [], options.validProjectIds)[0] ?? '',
    tags: filterKnownIds(tags, options.validTagIds),
  }
}
