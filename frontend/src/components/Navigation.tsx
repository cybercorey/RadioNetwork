'use client';

import {
  Box,
  Container,
  HStack,
  Button,
  useColorModeValue,
  Image,
  Text,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaHome, FaHistory, FaChartLine, FaSearch, FaFire, FaExchangeAlt } from 'react-icons/fa';

export default function Navigation() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

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
            <Button
              as={Link}
              href="/"
              leftIcon={<FaHome />}
              variant="ghost"
              size="sm"
            >
              Home
            </Button>
            <Button
              as={Link}
              href="/plays"
              leftIcon={<FaHistory />}
              variant="ghost"
              size="sm"
            >
              All Plays
            </Button>
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
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
