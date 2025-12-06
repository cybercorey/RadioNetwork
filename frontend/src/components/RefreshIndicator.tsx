'use client';

import {
  Box,
  HStack,
  Spinner,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRefresh } from '@/context/RefreshContext';
import { format } from 'date-fns';
import { FaSync } from 'react-icons/fa';

export default function RefreshIndicator() {
  const { isRefreshing, lastUpdated } = useRefresh();
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      zIndex={100}
    >
      <Tooltip
        label={lastUpdated ? `Last updated: ${format(lastUpdated, 'PPpp')}` : 'No updates yet'}
        placement="left"
      >
        <HStack
          bg={bgColor}
          px={3}
          py={2}
          borderRadius="full"
          spacing={2}
          boxShadow="md"
          opacity={isRefreshing ? 1 : 0.7}
          transition="opacity 0.2s"
          _hover={{ opacity: 1 }}
        >
          {isRefreshing ? (
            <Spinner size="sm" color="brand.500" />
          ) : (
            <Box as={FaSync} color={textColor} boxSize={3} />
          )}
          <Text fontSize="xs" color={textColor} fontWeight="medium">
            {lastUpdated ? format(lastUpdated, 'h:mm:ss a') : '--:--:--'}
          </Text>
        </HStack>
      </Tooltip>
    </Box>
  );
}
