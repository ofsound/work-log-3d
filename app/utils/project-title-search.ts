/** Normalize separators, camel case, case, and accents before matching title fragments. */
const normalize = (value: string) =>
  value
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const editDistance = (left: string, right: string): number => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    const row = [i]
    for (let j = 1; j <= right.length; j++) {
      row[j] = Math.min(
        row[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1),
      )
    }
    previous = row
  }
  return previous[right.length]!
}

const fragmentScore = (title: string, words: string[], fragment: string): number | null => {
  if (words.includes(fragment)) return 400
  if (words.some((word) => word.startsWith(fragment))) return 300
  if (title.includes(fragment)) return 240

  const initials = words.map((word) => word[0]).join('')
  if (fragment.length >= 2 && initials.startsWith(fragment)) return 200

  // Ordered characters allow abbreviations such as "clprt" for "Client Portal".
  if (fragment.length >= 3) {
    const compact = words.join('')
    let cursor = 0
    let first = -1
    let last = -1
    for (let index = 0; index < compact.length && cursor < fragment.length; index++) {
      if (compact[index] === fragment[cursor]) {
        if (first < 0) first = index
        last = index
        cursor++
      }
    }
    if (cursor === fragment.length) return 120 - (last - first + 1 - fragment.length)
  }

  // Keep typo tolerance conservative, especially for short searches.
  if (fragment.length >= 4) {
    const tolerance = fragment.length >= 7 ? 2 : 1
    const distance = Math.min(
      ...words
        .filter((word) => Math.abs(word.length - fragment.length) <= tolerance)
        .map((word) => editDistance(word, fragment)),
    )
    if (distance <= tolerance) return 60 - distance * 10
  }
  return null
}

/** All query fragments must match; stronger matches lead, ties retain the supplied order. */
export const searchProjectTitles = <T extends { name: string }>(
  projects: T[],
  query: string,
): T[] => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return projects
  const fragments = normalizedQuery.split(' ')

  return projects
    .map((project, index) => {
      const title = normalize(project.name)
      const words = title.split(' ')
      const scores = fragments.map((fragment) => fragmentScore(title, words, fragment))
      const score = scores.some((value) => value === null)
        ? -Infinity
        : scores.reduce<number>((sum, value) => sum + (value ?? 0), 0) / fragments.length +
          (title === normalizedQuery ? 1000 : title.startsWith(normalizedQuery) ? 500 : 0)
      return { project, score, index }
    })
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ project }) => project)
}
