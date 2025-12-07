'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Spinner,
  useColorModeValue,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Select,
  Button,
  Icon,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaHistory, FaCalendarDay, FaClock, FaArrowLeft, FaSync } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';

interface StationPlay {
  station: {
    id: number;
    name: string;
    slug: string;
  };
  song: {
    id: number;
    title: string;
    artist: string;
  };
  playedAt: string;
  legacyStation: string;
}

interface YearData {
  year: number;
  targetTime: string;
  stations: StationPlay[];
}

interface HistoryData {
  currentDate: {
    month: number;
    day: number;
    hour: number;
    minute: number;
    displayDate: string;
    displayTime: string;
  };
  years: YearData[];
  source: string;
}

export default function ThisDayInHistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('orange.500', 'orange.300');

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/plays/this-day-in-history?hour=${selectedHour}&source=v1`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHour]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-refresh every minute if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHistory]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box>
            <Button
              as={Link}
              href="/"
              leftIcon={<FaArrowLeft />}
              variant="ghost"
              size="sm"
              mb={4}
            >
              Back to Home
            </Button>

            <HStack spacing={4} mb={2}>
              <Icon as={FaHistory} boxSize={8} color={accentColor} />
              <Heading size="xl">This Day in Radio History</Heading>
            </HStack>
            <Text color="gray.500" fontSize="lg">
              See what was playing on NZ radio at this exact time, years ago
            </Text>
          </Box>

          {/* Controls */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Flex gap={4} flexWrap="wrap" alignItems="center">
                <HStack>
                  <Icon as={FaCalendarDay} color={accentColor} />
                  <Text fontWeight="semibold">
                    {data?.currentDate.displayDate || format(new Date(), 'MMMM d')}
                  </Text>
                </HStack>

                <HStack>
                  <Icon as={FaClock} color={accentColor} />
                  <Select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                    w="150px"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </Select>
                </HStack>

                <Button
                  leftIcon={<FaSync />}
                  onClick={fetchHistory}
                  isLoading={isLoading}
                  colorScheme="orange"
                  variant="outline"
                  size="sm"
                >
                  Refresh
                </Button>

                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  colorScheme={autoRefresh ? 'green' : 'gray'}
                  variant={autoRefresh ? 'solid' : 'outline'}
                  size="sm"
                >
                  {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                </Button>

                <Badge colorScheme="orange" fontSize="sm" px={3} py={1}>
                  Legacy Data (2013-2015)
                </Badge>
              </Flex>
            </CardBody>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Flex justify="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color={accentColor} />
                <Text>Loading historical data...</Text>
              </VStack>
            </Flex>
          )}

          {/* No Data State */}
          {!isLoading && (!data?.years || data.years.length === 0) && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardBody textAlign="center" py={12}>
                <Icon as={FaHistory} boxSize={12} color="gray.400" mb={4} />
                <Heading size="md" color="gray.500" mb={2}>
                  No Historical Data Available
                </Heading>
                <Text color="gray.400">
                  No radio plays were recorded for {data?.currentDate.displayDate} at {selectedHour}:00 in the legacy archive.
                </Text>
                <Text color="gray.400" mt={2}>
                  Try a different hour to find when stations were active.
                </Text>
              </CardBody>
            </Card>
          )}

          {/* History by Year */}
          {!isLoading && data?.years && data.years.length > 0 && (
            <VStack spacing={6} align="stretch">
              {data.years.map((yearData) => (
                <Card key={yearData.year} bg={cardBg} borderColor={borderColor} borderWidth="1px" overflow="hidden">
                  <CardHeader bg={useColorModeValue('orange.50', 'orange.900')} py={4}>
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Badge colorScheme="orange" fontSize="xl" px={4} py={2}>
                          {yearData.year}
                        </Badge>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="lg">
                            {data.currentDate.displayDate}, {yearData.year}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Around {selectedHour}:00
                          </Text>
                        </VStack>
                      </HStack>
                      <Stat textAlign="right">
                        <StatLabel>Stations Playing</StatLabel>
                        <StatNumber color={accentColor}>{yearData.stations.length}</StatNumber>
                      </Stat>
                    </HStack>
                  </CardHeader>

                  <CardBody p={0}>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={0}>
                      {yearData.stations.map((play, index) => (
                        <Box
                          key={`${play.station.id}-${index}`}
                          p={4}
                          borderBottomWidth="1px"
                          borderRightWidth={{ base: '0', md: '1px' }}
                          borderColor={borderColor}
                          _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                        >
                          <VStack align="start" spacing={2}>
                            <HStack justify="space-between" w="full">
                              <Badge colorScheme="blue" variant="subtle">
                                {play.legacyStation}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {format(new Date(play.playedAt), 'h:mm a')}
                              </Text>
                            </HStack>

                            <Box>
                              <ChakraLink
                                as={Link}
                                href={`/songs/${play.song.id}`}
                                fontWeight="semibold"
                                fontSize="md"
                                _hover={{ color: accentColor }}
                              >
                                {play.song.title}
                              </ChakraLink>
                              <Text fontSize="sm" color="gray.500">
                                {play.song.artist}
                              </Text>
                            </Box>
                          </VStack>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}

          {/* Summary Stats */}
          {!isLoading && data?.years && data.years.length > 0 && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Stat textAlign="center">
                    <StatLabel>Years with Data</StatLabel>
                    <StatNumber color={accentColor}>{data.years.length}</StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Total Stations</StatLabel>
                    <StatNumber color={accentColor}>
                      {data.years.reduce((sum, y) => sum + y.stations.length, 0)}
                    </StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Earliest Year</StatLabel>
                    <StatNumber color={accentColor}>
                      {Math.min(...data.years.map(y => y.year))}
                    </StatNumber>
                  </Stat>
                  <Stat textAlign="center">
                    <StatLabel>Latest Year</StatLabel>
                    <StatNumber color={accentColor}>
                      {Math.max(...data.years.map(y => y.year))}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
