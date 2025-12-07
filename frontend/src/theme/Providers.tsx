'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@chakra-ui/next-js';
import theme from './chakra';
import { RefreshProvider } from '@/context/RefreshContext';
import { LegacyModeProvider } from '@/context/LegacyModeContext';
import RefreshIndicator from '@/components/RefreshIndicator';
import LegacyModeStyles from '@/components/LegacyModeStyles';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <LegacyModeProvider>
          <RefreshProvider>
            <LegacyModeStyles />
            {children}
            <RefreshIndicator />
          </RefreshProvider>
        </LegacyModeProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
