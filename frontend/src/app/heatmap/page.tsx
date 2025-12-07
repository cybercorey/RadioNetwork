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
  Select,
  Button,
  Icon,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Tooltip,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaFire, FaClock, FaArrowLeft, FaChartBar } from 'react-icons/fa';
import api from '@/services/api';
import { useStations } from '@/hooks/useStations';

interface StationHeatmap {
  station: {
    id: number;
    name: string;
    slug: string;
  };
  hourlyData: number[];
  peakHour: number;
  maxCount: number;
}

interface HeatmapData {
  timeframe: string;
  source: string;
  metric: string;
  station: { id: number; name: string; slug: string } | null;
  matrix: number[][];
  maxCount: number;
  peakHours: { hour: number; total: number }[];
  dayLabels: string[];
  stationHeatmaps: StationHeatmap[];
}

const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
];

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<number>(30);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [metric, setMetric] = useState<string>('total');

  const { stations } = useStations();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('purple.500', 'purple.300');

  const fetchHeatmap = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        days: days.toString(),
        source: sourceFilter,
        metric,
      });
      if (stationFilter !== 'all') {
        params.append('station', stationFilter);
      }
      const response = await api.get(`/plays/heatmap?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    } finally {
      setIsLoading(false);
    }
  }, [days, sourceFilter, stationFilter, metric]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // Get color intensity based on value
  const getHeatColor = (value: number, max: number): string => {
    if (max === 0 || value === 0) return useColorModeValue('gray.100', 'gray.700');
    const intensity = value / max;

    if (intensity > 0.8) return useColorModeValue('red.500', 'red.400');
    if (intensity > 0.6) return useColorModeValue('orange.400', 'orange.300');
    if (intensity > 0.4) return useColorModeValue('yellow.400', 'yellow.300');
    if (intensity > 0.2) return useColorModeValue('green.300', 'green.400');
    return useColorModeValue('green.100', 'green.700');
  };

  // Get bar width for station hourly chart
  const getBarWidth = (value: number, max: number): string => {
    if (max === 0) return '0%';
    return `${(value / max) * 100}%`;
  };

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
              <Icon as={FaFire} boxSize={8} color={accentColor} />
              <Heading size="xl">Peak Hour Heatmaps</Heading>
            </HStack>
            <Text color="gray.500" fontSize="lg">
              Visualize when each station plays the most content
            </Text>
          </Box>

          {/* Controls */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>Time Range</Text>
                  <Select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>Data Source</Text>
                  <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                    <option value="all">All Data</option>
                    <option value="v2">Modern (v2)</option>
                    <option value="v1">Legacy (v1)</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>Station</Text>
                  <Select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}>
                    <option value="all">All Stations</option>
                    {stations.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.name}</option>
                    ))}
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>Metric</Text>
                  <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
                    <option value="total">Total Plays</option>
                    <option value="unique">Unique Songs</option>
                  </Select>
                </Box>

                <Flex align="end">
                  <Button
                    onClick={fetchHeatmap}
                    isLoading={isLoading}
                    colorScheme="purple"
                    w="full"
                  >
                    Update
                  </Button>
                </Flex>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Flex justify="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color={accentColor} />
                <Text>Loading heatmap data...</Text>
              </VStack>
            </Flex>
          )}

          {/* Peak Hours Summary */}
          {!isLoading && data && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardHeader>
                <HStack>
                  <Icon as={FaClock} color={accentColor} />
                  <Heading size="md">Top Peak Hours</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                  {data.peakHours.slice(0, 5).map((peak, index) => (
                    <Stat key={peak.hour} textAlign="center">
                      <StatLabel>
                        <Badge colorScheme={index === 0 ? 'red' : index === 1 ? 'orange' : 'yellow'}>
                          #{index + 1}
                        </Badge>
                      </StatLabel>
                      <StatNumber color={accentColor}>{HOUR_LABELS[peak.hour]}</StatNumber>
                      <Text fontSize="sm" color="gray.500">
                        {peak.total.toLocaleString()} plays
                      </Text>
                    </Stat>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card>
          )}

          {/* Main Heatmap Grid */}
          {!isLoading && data && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" overflow="hidden">
              <CardHeader>
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaChartBar} color={accentColor} />
                    <Heading size="md">
                      {data.station ? `${data.station.name} - ` : ''}Activity by Day & Hour
                    </Heading>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.500">
                      {data.timeframe} | {metric === 'total' ? 'Total Plays' : 'Unique Songs'}
                    </Text>
                    {data.source !== 'all' && (
                      <Badge colorScheme={data.source === 'v1' ? 'orange' : 'blue'}>
                        {data.source === 'v1' ? 'Legacy' : 'Modern'}
                      </Badge>
                    )}
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th></Th>
                      {HOUR_LABELS.map((label, i) => (
                        <Th key={i} textAlign="center" px={1} fontSize="xs">
                          {i % 3 === 0 ? label : ''}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.dayLabels.map((day, dayIndex) => (
                      <Tr key={day}>
                        <Td fontWeight="semibold" pr={4}>{day}</Td>
                        {data.matrix[dayIndex].map((value, hourIndex) => (
                          <Td key={hourIndex} p={0}>
                            <Tooltip
                              label={`${day} ${HOUR_LABELS[hourIndex]}: ${value.toLocaleString()} ${metric === 'total' ? 'plays' : 'unique songs'}`}
                              hasArrow
                            >
                              <Box
                                w="20px"
                                h="20px"
                                bg={getHeatColor(value, data.maxCount)}
                                borderRadius="sm"
                                cursor="pointer"
                                transition="transform 0.1s"
                                _hover={{ transform: 'scale(1.2)' }}
                              />
                            </Tooltip>
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                {/* Legend */}
                <HStack justify="center" mt={4} spacing={2}>
                  <Text fontSize="xs" color="gray.500">Less</Text>
                  <Box w="16px" h="16px" bg={useColorModeValue('green.100', 'green.700')} borderRadius="sm" />
                  <Box w="16px" h="16px" bg={useColorModeValue('green.300', 'green.400')} borderRadius="sm" />
                  <Box w="16px" h="16px" bg={useColorModeValue('yellow.400', 'yellow.300')} borderRadius="sm" />
                  <Box w="16px" h="16px" bg={useColorModeValue('orange.400', 'orange.300')} borderRadius="sm" />
                  <Box w="16px" h="16px" bg={useColorModeValue('red.500', 'red.400')} borderRadius="sm" />
                  <Text fontSize="xs" color="gray.500">More</Text>
                </HStack>
              </CardBody>
            </Card>
          )}

          {/* Per-Station Heatmaps */}
          {!isLoading && data && data.stationHeatmaps && data.stationHeatmaps.length > 0 && (
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardHeader>
                <Heading size="md">Station Peak Hours</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {data.stationHeatmaps.map((stationData) => (
                    <Box key={stationData.station.id}>
                      <HStack justify="space-between" mb={2}>
                        <ChakraLink
                          as={Link}
                          href={`/stations/${stationData.station.slug}`}
                          fontWeight="semibold"
                          _hover={{ color: accentColor }}
                        >
                          {stationData.station.name}
                        </ChakraLink>
                        <HStack>
                          <Badge colorScheme="purple">
                            Peak: {HOUR_LABELS[stationData.peakHour]}
                          </Badge>
                          <Text fontSize="sm" color="gray.500">
                            {stationData.hourlyData.reduce((a, b) => a + b, 0).toLocaleString()} total
                          </Text>
                        </HStack>
                      </HStack>

                      {/* Hourly bar chart */}
                      <HStack spacing={1} h="30px">
                        {stationData.hourlyData.map((count, hour) => (
                          <Tooltip
                            key={hour}
                            label={`${HOUR_LABELS[hour]}: ${count.toLocaleString()} plays`}
                            hasArrow
                          >
                            <Box
                              flex={1}
                              h="full"
                              bg={hour === stationData.peakHour
                                ? useColorModeValue('purple.400', 'purple.300')
                                : useColorModeValue('purple.100', 'purple.700')
                              }
                              borderRadius="sm"
                              position="relative"
                              cursor="pointer"
                              _hover={{ opacity: 0.8 }}
                            >
                              <Box
                                position="absolute"
                                bottom={0}
                                left={0}
                                right={0}
                                h={getBarWidth(count, stationData.maxCount)}
                                bg={hour === stationData.peakHour
                                  ? useColorModeValue('purple.500', 'purple.400')
                                  : useColorModeValue('purple.300', 'purple.500')
                                }
                                borderRadius="sm"
                              />
                            </Box>
                          </Tooltip>
                        ))}
                      </HStack>

                      {/* Hour labels */}
                      <HStack spacing={1} mt={1}>
                        {HOUR_LABELS.map((label, i) => (
                          <Text
                            key={i}
                            flex={1}
                            fontSize="6px"
                            textAlign="center"
                            color="gray.400"
                          >
                            {i % 6 === 0 ? label : ''}
                          </Text>
                        ))}
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
