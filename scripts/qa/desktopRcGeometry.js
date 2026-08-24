(() => {
  const root = document.documentElement
  const visible = [...document.querySelectorAll('button, input, [role="tab"], [role="option"], main, nav')]
    .filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= innerHeight
    })
  const clipped = visible.filter((element) => {
    const rect = element.getBoundingClientRect()
    return rect.left < -1 || rect.right > innerWidth + 1
  }).map((element) => ({
    role: element.getAttribute('role') || element.tagName.toLowerCase(),
    text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 60),
  }))
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    horizontalOverflow: root.scrollWidth > root.clientWidth,
    documentSize: `${root.scrollWidth}x${root.scrollHeight}`,
    clipped,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    activeElement: document.activeElement?.getAttribute('aria-label') || document.activeElement?.id || document.activeElement?.tagName,
  }
})()
