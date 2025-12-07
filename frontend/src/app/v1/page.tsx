'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLegacyMode } from '@/context/LegacyModeContext';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function V1RedirectPage() {
  const router = useRouter();
  const { setLegacyMode } = useLegacyMode();

  useEffect(() => {
    // Enable legacy mode and redirect to plays page
    setLegacyMode(true);
    router.replace('/plays');
  }, [setLegacyMode, router]);

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Spinner size="xl" color="orange.500" />
        <Text>Switching to Legacy Mode...</Text>
      </VStack>
    </Box>
  );
}
