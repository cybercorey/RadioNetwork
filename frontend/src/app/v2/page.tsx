'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLegacyMode } from '@/context/LegacyModeContext';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function V2RedirectPage() {
  const router = useRouter();
  const { setLegacyMode } = useLegacyMode();

  useEffect(() => {
    // Disable legacy mode and redirect to home page
    setLegacyMode(false);
    router.replace('/');
  }, [setLegacyMode, router]);

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Spinner size="xl" color="blue.500" />
        <Text>Switching to Modern Mode...</Text>
      </VStack>
    </Box>
  );
}
