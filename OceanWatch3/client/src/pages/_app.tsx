import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ShipProvider } from '@/providers/ShipProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ShipProvider>
      <Component {...pageProps} />
    </ShipProvider>
  )
}
