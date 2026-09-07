import { AuthProvider } from '@/providers/Auth'
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import { stripeAdapterClient } from '@payloadcms/plugin-ecommerce/payments/stripe'
import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { SonnerProvider } from '@/providers/Sonner'
import { EcommerceSession } from '@/providers/EcommerceSession'
import { SUPPORTED_CURRENCIES } from '@/currencies'
import { getStoreCurrency } from '@/utilities/getStoreCurrency'

/**
 * Server component, so the store's currency is resolved before the client
 * provider mounts. It drives every formatted price and the currency sent to
 * Stripe, so display and payment can never disagree.
 */
export const Providers = async ({ children }: { children: React.ReactNode }) => {
  const currency = await getStoreCurrency()

  return (
    <ThemeProvider>
      <AuthProvider>
        <HeaderThemeProvider>
          <SonnerProvider />
          <EcommerceProvider
            currenciesConfig={{
              defaultCurrency: currency,
              supportedCurrencies: SUPPORTED_CURRENCIES,
            }}
            enableVariants={true}
            api={{
              cartsFetchQuery: {
                depth: 2,
                populate: {
                  products: {
                    slug: true,
                    title: true,
                    gallery: true,
                    inventory: true,
                  },
                  variants: {
                    title: true,
                    inventory: true,
                  },
                },
              },
            }}
            paymentMethods={[
              stripeAdapterClient({
                publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
              }),
            ]}
          >
            <EcommerceSession />
            {children}
          </EcommerceProvider>
        </HeaderThemeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
