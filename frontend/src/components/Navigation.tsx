'use client';

import {
  Box,
  Container,
  HStack,
  Button,
  useColorModeValue,
  Image,
  Text,
  Switch,
  Tooltip,
  Divider,
} from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaHome, FaHistory, FaChartLine, FaSearch, FaFire, FaExchangeAlt } from 'react-icons/fa';
import { useLegacyMode } from '@/context/LegacyModeContext';

// Pages that are not supported in legacy mode (only /plays and /songs/* are supported)
const LEGACY_UNSUPPORTED_PAGES = ['/analytics', '/insights', '/compare', '/playlists', '/search', '/stations'];

export default function Navigation() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { isLegacyMode, toggleLegacyMode } = useLegacyMode();
  const pathname = usePathname();
  const router = useRouter();

  const handleLegacyToggle = () => {
    // If switching to legacy mode and on an unsupported page, redirect to home
    if (!isLegacyMode && LEGACY_UNSUPPORTED_PAGES.some(page => pathname.startsWith(page))) {
      router.push('/');
    }
    toggleLegacyMode();
  };

  return (
    <Box
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Container maxW="container.xl">
        <HStack justify="space-between" py={4}>
          <Link href="/">
            <HStack spacing={2}>
              <Image src="/logo.svg" alt="RadioNetwork Logo" boxSize="32px" />
              <Text fontSize="lg" fontWeight="bold">RadioNetwork</Text>
            </HStack>
          </Link>
          <HStack spacing={4}>
            {!isLegacyMode && (
              <Button
                as={Link}
                href="/"
                leftIcon={<FaHome />}
                variant="ghost"
                size="sm"
              >
                Home
              </Button>
            )}
            <Button
              as={Link}
              href="/plays"
              leftIcon={<FaHistory />}
              variant="ghost"
              size="sm"
            >
              {isLegacyMode ? 'Legacy Plays' : 'All Plays'}
            </Button>
            {!isLegacyMode && (
              <>
                <Button
                  as={Link}
                  href="/search"
                  leftIcon={<FaSearch />}
                  variant="ghost"
                  size="sm"
                >
                  Search
                </Button>
                <Button
                  as={Link}
                  href="/analytics"
                  leftIcon={<FaChartLine />}
                  variant="ghost"
                  size="sm"
                >
                  Analytics
                </Button>
                <Button
                  as={Link}
                  href="/insights"
                  leftIcon={<FaFire />}
                  variant="ghost"
                  size="sm"
                >
                  Insights
                </Button>
                <Button
                  as={Link}
                  href="/compare"
                  leftIcon={<FaExchangeAlt />}
                  variant="ghost"
                  size="sm"
                >
                  Compare
                </Button>
              </>
            )}
            <Divider orientation="vertical" h="24px" />
            <Tooltip
              label={isLegacyMode ? 'Switch to Modern Mode (v2)' : 'Switch to Legacy Mode (v1 - 2013-2015)'}
              placement="bottom"
            >
              <HStack spacing={2}>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {isLegacyMode ? 'LEGACY' : 'MODERN'}
                </Text>
                <Switch
                  size="sm"
                  isChecked={isLegacyMode}
                  onChange={handleLegacyToggle}
                  colorScheme={isLegacyMode ? 'orange' : 'blue'}
                />
              </HStack>
            </Tooltip>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
