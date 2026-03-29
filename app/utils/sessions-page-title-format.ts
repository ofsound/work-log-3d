export function formatSessionsDayPageTitleCompact(date: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()
  return `${weekday} ${month}/${day}/${year}`
}
