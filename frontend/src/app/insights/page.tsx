'use client';

import { useEffect, useState } from 'react';
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
  Button,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Link as ChakraLink,
  Icon,
  Progress,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaArrowLeft, FaFire, FaExchangeAlt, FaChartLine, FaUser } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MomentumSong {
  id: number;
  title: string;
  artist: string;
  current_plays: number;
  previous_plays: number;
  momentum_delta: number;
  momentum_percent: number;
  current_stations: number;
}

interface CrossStationSong {
  id: number;
  title: string;
  artist: string;
  station_count: number;
  total_plays: number;
  stations: string[];
  last_played: string;
}

interface StationOverlap {
  station_a_name: string;
  station_b_name: string;
  shared_songs: number;
}

export default function InsightsPage() {
  const [momentum, setMomentum] = useState<{ songs: MomentumSong[] } | null>(null);
  const [crossStation, setCrossStation] = useState<any>(null);
  const [genreEvolution, setGenreEvolution] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 300000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const [momentumRes, crossStationRes, genreEvolutionRes] = await Promise.all([
        api.get('/analytics/song-momentum?limit=50&days=7'),
        api.get('/analytics/cross-station?days=30'),
        api.get('/analytics/genre-evolution?months=6'),
      ]);

      setMomentum(momentumRes.data);
      setCrossStation(crossStationRes.data);
      setGenreEvolution(genreEvolutionRes.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading insights...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <HStack mb={2}>
                <FaChartLine size={32} />
                <Heading size="xl">Advanced Insights</Heading>
              </HStack>
              <Text color="gray.500">Deep analytics and trend analysis</Text>
            </Box>
            <Button as={Link} href="/" leftIcon={<FaArrowLeft />} variant="ghost">
              Back
            </Button>
          </HStack>

          {/* Insights Tabs */}
          <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaFire} />
                    <Text>Song Momentum</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaExchangeAlt} />
                    <Text>Cross-Station</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaChartLine} />
                    <Text>Genre Evolution</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Song Momentum */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Song Momentum Tracker
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          Songs with increasing play counts ({momentum?.timeframe})
                        </Text>
                      </Box>
                      <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>#</Th>
                              <Th>Song</Th>
                              <Th>Artist</Th>
                              <Th isNumeric>Current Plays</Th>
                              <Th isNumeric>Previous</Th>
                              <Th isNumeric>Change</Th>
                              <Th>Momentum</Th>
                              <Th isNumeric>Stations</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {momentum?.songs.map((song, index) => (
                              <Tr key={song.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                                <Td fontWeight="bold" color="gray.500">{index + 1}</Td>
                                <Td>
                                  <ChakraLink
                                    as={Link}
                                    href={`/songs/${song.id}`}
                                    fontWeight="semibold"
                                    color="brand.500"
                                    _hover={{ textDecoration: 'underline' }}
                                  >
                                    {song.title}
                                  </ChakraLink>
                                </Td>
                                <Td>{song.artist}</Td>
                                <Td isNumeric>{song.current_plays}</Td>
                                <Td isNumeric color="gray.500">{song.previous_plays}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme="green" fontSize="sm">
                                    +{song.momentum_delta}
                                  </Badge>
                                </Td>
                                <Td>
                                  <HStack>
                                    <Progress
                                      value={Math.min(song.momentum_percent, 100)}
                                      size="sm"
                                      colorScheme="green"
                                      w="100px"
                                      borderRadius="full"
                                    />
                                    <Text fontSize="xs" color="green.500">
                                      {song.momentum_percent.toFixed(0)}%
                                    </Text>
                                  </HStack>
                                </Td>
                                <Td isNumeric>
                                  <Badge colorScheme="purple">{song.current_stations}</Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </VStack>
                  </Box>
                </TabPanel>

                {/* Cross-Station */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={8}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Cross-Station Analysis
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          Songs played across multiple stations ({crossStation?.timeframe})
                        </Text>
                      </Box>

                      <Box overflowX="auto">
                        <Heading size="sm" mb={3}>Top Cross-Station Songs</Heading>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Song</Th>
                              <Th>Artist</Th>
                              <Th isNumeric>Stations</Th>
                              <Th isNumeric>Total Plays</Th>
                              <Th>Playing On</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {crossStation?.crossStationSongs.slice(0, 20).map((song: CrossStationSong) => (
                              <Tr key={song.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                                <Td>
                                  <ChakraLink
                                    as={Link}
                                    href={`/songs/${song.id}`}
                                    fontWeight="semibold"
                                    color="brand.500"
                                    _hover={{ textDecoration: 'underline' }}
                                  >
                                    {song.title}
                                  </ChakraLink>
                                </Td>
                                <Td>{song.artist}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme="purple" fontSize="md" px={2}>
                                    {song.station_count}
                                  </Badge>
                                </Td>
                                <Td isNumeric>{song.total_plays}</Td>
                                <Td>
                                  <HStack spacing={1} flexWrap="wrap">
                                    {song.stations.slice(0, 3).map((station: string) => (
                                      <Badge key={station} size="sm" variant="subtle" colorScheme="blue">
                                        {station}
                                      </Badge>
                                    ))}
                                    {song.stations.length > 3 && (
                                      <Text fontSize="xs" color="gray.500">
                                        +{song.stations.length - 3} more
                                      </Text>
                                    )}
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>

                      <Box overflowX="auto">
                        <Heading size="sm" mb={3}>Station Similarity</Heading>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Station A</Th>
                              <Th>Station B</Th>
                              <Th isNumeric>Shared Songs</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {crossStation?.stationOverlap.map((overlap: StationOverlap, idx: number) => (
                              <Tr key={idx}>
                                <Td fontWeight="semibold">{overlap.station_a_name}</Td>
                                <Td fontWeight="semibold">{overlap.station_b_name}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme="green" fontSize="md" px={2}>
                                    {overlap.shared_songs}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </VStack>
                  </Box>
                </TabPanel>

                {/* Genre Evolution */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Genre Evolution Over Time
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          Genre popularity trends ({genreEvolution?.timeframe})
                        </Text>
                      </Box>
                      <Box h="400px">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={genreEvolution?.evolution || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="month"
                              tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
                            />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(value) => format(new Date(value), 'MMMM yyyy')}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="plays" stroke="#8884d8" name="Plays" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </VStack>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
