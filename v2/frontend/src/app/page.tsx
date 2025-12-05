'use client';

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useColorModeValue,
  Card,
  CardHeader,
  CardBody,
} from '@chakra-ui/react';
import { useStations } from '@/hooks/useStations';
import Link from 'next/link';
import { FaMusic, FaRadio } from 'react-icons/fa';

export default function Home() {
  const { stations, isLoading } = useStations();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading stations...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="2xl" mb={2}>
              🎵 RadioNetwork v2
            </Heading>
            <Text fontSize="xl" color="gray.500">
              Live NZ Radio Station Tracking
            </Text>
          </Box>

          {/* Stats */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="3xl" fontWeight="bold" color="brand.500">
                  {stations.length}
                </Text>
                <Text color="gray.500">Active Stations</Text>
              </CardBody>
            </Card>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="3xl" fontWeight="bold" color="green.500">
                  <FaRadio style={{ display: 'inline', marginRight: '8px' }} />
                  Live
                </Text>
                <Text color="gray.500">Real-time Tracking</Text>
              </CardBody>
            </Card>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="3xl" fontWeight="bold" color="purple.500">
                  <FaMusic style={{ display: 'inline', marginRight: '8px' }} />
                </Text>
                <Text color="gray.500">Now Playing</Text>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Stations */}
          <Box>
            <Heading size="lg" mb={4}>
              Radio Stations
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {stations.map((station) => (
                <Card key={station.id} bg={cardBg} _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }} transition="all 0.2s">
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="md">{station.name}</Heading>
                      {station.isActive && <Badge colorScheme="green">Active</Badge>}
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack wrap="wrap" spacing={2}>
                        {station.tags.map((tag) => (
                          <Badge key={tag} variant="subtle" colorScheme="blue">
                            {tag}
                          </Badge>
                        ))}
                      </HStack>
                      <Button
                        as={Link}
                        href={`/stations/${station.slug}`}
                        colorScheme="brand"
                        size="sm"
                      >
                        View Station
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
