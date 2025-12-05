'use client';

import {
  Box,
  Container,
  HStack,
  Button,
  useColorModeValue,
  Heading,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaHome, FaHistory } from 'react-icons/fa';

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
          <Heading size="md">
            <Link href="/">RadioNetwork v2</Link>
          </Heading>
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
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
