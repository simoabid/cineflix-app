import { ReactLenis, useLenis } from 'lenis/react'
import React, { type ReactNode, useEffect } from 'react'
import { setLenisInstance } from '../../utils/scroll'

interface LenisProviderProps {
  readonly children: ReactNode
}

function LenisInstanceConnector(): null {
  const lenis = useLenis()

  useEffect(() => {
    setLenisInstance(lenis ?? null)
    return () => {
      setLenisInstance(null)
    }
  }, [lenis])

  return null
}

export function LenisProvider({ children }: LenisProviderProps): React.JSX.Element {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
      }}
    >
      <LenisInstanceConnector />
      {children}
    </ReactLenis>
  )
}
