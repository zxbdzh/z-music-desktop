export interface SettingSearchItem {
  id: string
  groupId: string
  groupTitle: string
  title: string
  description: string
  keywords: string[]
  targetId?: string
}

const normalize = (value: string): string =>
  value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')

export const searchSettings = (
  items: SettingSearchItem[],
  query: string
): SettingSearchItem[] => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  const terms = normalizedQuery.split(' ')

  return items.filter((item) => {
    const searchable = normalize([
      item.title,
      item.description,
      item.groupTitle,
      ...item.keywords,
    ].join(' '))
    return terms.every((term) => searchable.includes(term))
  })
}

export const moveSearchSelection = (
  current: number,
  key: string,
  resultCount: number
): number => {
  if (resultCount < 1) return -1
  if (key == 'Home') return 0
  if (key == 'End') return resultCount - 1
  if (key == 'ArrowDown') return current < 0 ? 0 : (current + 1) % resultCount
  if (key == 'ArrowUp') return current < 0 ? resultCount - 1 : (current - 1 + resultCount) % resultCount
  return current
}
