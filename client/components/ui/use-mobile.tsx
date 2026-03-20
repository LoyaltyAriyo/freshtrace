import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const updateIsMobile = () => {
      const widthIsMobile = window.innerWidth < MOBILE_BREAKPOINT
      const ua =
        window.navigator.userAgent ||
        (window.navigator as any).vendor ||
        (window as any).opera
      const uaIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua,
      )

      const pointerIsCoarse =
        window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches
      const touchPoints =
        (window.navigator as any).maxTouchPoints ?? 0

      setIsMobile(
        widthIsMobile ||
          uaIsMobile ||
          pointerIsCoarse ||
          touchPoints > 1,
      )
    }

    updateIsMobile()

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlListener = () => updateIsMobile()
    mql.addEventListener?.('change', mqlListener)
    window.addEventListener('resize', updateIsMobile)

    return () => {
      mql.removeEventListener?.('change', mqlListener)
      window.removeEventListener('resize', updateIsMobile)
    }
  }, [])

  return !!isMobile
}
