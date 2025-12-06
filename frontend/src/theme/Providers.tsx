'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@chakra-ui/next-js';
import theme from './chakra';
import { RefreshProvider } from '@/context/RefreshContext';
import RefreshIndicator from '@/components/RefreshIndicator';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <RefreshProvider>
          {children}
          <RefreshIndicator />
        </RefreshProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
