import { useEffect, useCallback } from 'react'

export function useKeyboardShortcuts(shortcuts) {
  const handleKeyDown = useCallback(
    (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const withMeta = event.metaKey || event.ctrlKey
      const withShift = event.shiftKey

      for (const shortcut of shortcuts) {
        const matches =
          shortcut.key.toLowerCase() === key &&
          (shortcut.meta ?? false) === withMeta &&
          (shortcut.shift ?? false) === withShift

        if (matches) {
          event.preventDefault()
          shortcut.action()
          break
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
