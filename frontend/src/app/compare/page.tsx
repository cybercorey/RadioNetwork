'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  useColorModeValue,
  Select,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Progress,
  Checkbox,
  CheckboxGroup,
  Stack,
} from '@chakra-ui/react';
import { FaArrowLeft, FaExchangeAlt, FaChartBar, FaMusic, FaClock } from 'react-icons/fa';
import Link from 'next/link';
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
import api from '@/services/api';
import { format } from 'date-fns';

interface Station {
  id: number;
  name: string;
  slug: string;
  tags: string[];
  isActive: boolean;
}

interface StationStats {
  station: Station;
  stats: {
    totalPlays: number;
    uniqueSongs: number;
    uniqueArtists: number;
    topGenres: { genre: string; plays: number }[];
  };
}

interface OverlapSong {
  id: number;
  title: string;
  artist: string;
  stationCount: number;
  totalPlays: number;
  stations: string[];
}

interface UniqueSong {
  id: number;
  title: string;
  artist: string;
  playCount: number;
}

interface TimelineData {
  stationId: number;
  stationName: string;
  data: { date: string; plays: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ComparePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [statsData, setStatsData] = useState<StationStats[]>([]);
  const [overlapSongs, setOverlapSongs] = useState<OverlapSong[]>([]);
  const [uniqueSongs, setUniqueSongs] = useState<{ [key: number]: UniqueSong[] }>({});
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [timeRange, setTimeRange] = useState<number>(30);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch all stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await api.get('/stations');
        setStations(response.data);
      } catch (error) {
        console.error('Failed to fetch stations:', error);
      }
    };
    fetchStations();
  }, []);

  const handleCompare = async () => {
    if (selectedStations.length < 2) {
      alert('Please select at least 2 stations to compare');
      return;
    }

    setIsLoading(true);
    setHasCompared(true);

    try {
      const stationIds = selectedStations.join(',');

      // Fetch comparison data in parallel
      const [statsRes, overlapRes, timelineRes] = await Promise.all([
        api.get(`/stations/compare/stats?stationIds=${stationIds}&days=${timeRange}`),
        api.get(`/stations/compare/overlap?stationIds=${stationIds}&days=${timeRange}&limit=50`),
        api.get(`/stations/compare/timeline?stationIds=${stationIds}&days=7`),
      ]);

      setStatsData(statsRes.data.stations);
      setOverlapSongs(overlapRes.data.songs);
      setTimeline(timelineRes.data.timeline);

      // Fetch unique songs for each station
      const uniqueData: { [key: number]: UniqueSong[] } = {};
      for (const stationId of selectedStations) {
        const compareIds = selectedStations.filter(id => id !== stationId).join(',');
        const response = await api.get(
          `/stations/compare/unique?stationId=${stationId}&compareIds=${compareIds}&days=${timeRange}&limit=20`
        );
        uniqueData[stationId] = response.data.songs;
      }
      setUniqueSongs(uniqueData);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationToggle = (stationId: number) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  // Prepare timeline chart data
  const prepareTimelineData = () => {
    if (timeline.length === 0) return [];

    const allDates = new Set<string>();
    timeline.forEach(t => t.data.forEach(d => allDates.add(d.date)));

    return Array.from(allDates).sort().map(date => {
      const dataPoint: any = { date: format(new Date(date), 'MMM d') };
      timeline.forEach(t => {
        const dayData = t.data.find(d => d.date === date);
        dataPoint[t.stationName] = dayData?.plays || 0;
      });
      return dataPoint;
    });
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <HStack mb={2}>
                <Icon as={FaExchangeAlt} boxSize={8} />
                <Heading size="xl">Station Comparison</Heading>
              </HStack>
              <Text color="gray.500">Compare stats, overlap, and unique content across stations</Text>
            </Box>
            <Button as={Link} href="/" leftIcon={<FaArrowLeft />} variant="ghost">
              Back
            </Button>
          </HStack>

          {/* Station Selection */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md">Select Stations to Compare</Heading>
                <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                  {selectedStations.length} selected
                </Badge>
              </HStack>

              <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
                {stations.map(station => (
                  <Checkbox
                    key={station.id}
                    isChecked={selectedStations.includes(station.id)}
                    onChange={() => handleStationToggle(station.id)}
                    colorScheme="brand"
                  >
                    <Text fontWeight="medium">{station.name}</Text>
                  </Checkbox>
                ))}
              </SimpleGrid>

              <HStack justify="space-between">
                <HStack>
                  <Text fontSize="sm">Time Range:</Text>
                  <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value))}
                    w="150px"
                    size="sm"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                  </Select>
                </HStack>

                <Button
                  colorScheme="brand"
                  leftIcon={<Icon as={FaChartBar} />}
                  onClick={handleCompare}
                  isLoading={isLoading}
                  isDisabled={selectedStations.length < 2}
                >
                  Compare Stations
                </Button>
              </HStack>
            </VStack>
          </Box>

          {/* Results */}
          {isLoading ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" color="brand.500" mb={4} />
              <Text>Comparing stations...</Text>
            </Box>
          ) : hasCompared && statsData.length > 0 ? (
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>
                  <Icon as={FaChartBar} mr={2} />
                  Statistics
                </Tab>
                <Tab>
                  <Icon as={FaMusic} mr={2} />
                  Song Overlap
                </Tab>
                <Tab>
                  <Icon as={FaMusic} mr={2} />
                  Unique Songs
                </Tab>
                <Tab>
                  <Icon as={FaClock} mr={2} />
                  Timeline
                </Tab>
              </TabList>

              <TabPanels>
                {/* Statistics Tab */}
                <TabPanel p={0} pt={4}>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: selectedStations.length }} spacing={4}>
                    {statsData.map((data, idx) => (
                      <Box
                        key={data.station.id}
                        bg={cardBg}
                        p={6}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                      >
                        <VStack align="stretch" spacing={4}>
                          <Box>
                            <Heading size="md" mb={2}>
                              {data.station.name}
                            </Heading>
                            <HStack spacing={2} flexWrap="wrap">
                              {data.station.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} colorScheme="blue" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>
                          </Box>

                          <SimpleGrid columns={1} spacing={3}>
                            <Stat>
                              <StatLabel fontSize="sm">Total Plays</StatLabel>
                              <StatNumber color="brand.500">
                                {data.stats.totalPlays.toLocaleString()}
                              </StatNumber>
                            </Stat>

                            <Stat>
                              <StatLabel fontSize="sm">Unique Songs</StatLabel>
                              <StatNumber color="purple.500">
                                {data.stats.uniqueSongs.toLocaleString()}
                              </StatNumber>
                            </Stat>

                            <Stat>
                              <StatLabel fontSize="sm">Unique Artists</StatLabel>
                              <StatNumber color="green.500">
                                {data.stats.uniqueArtists.toLocaleString()}
                              </StatNumber>
                            </Stat>
                          </SimpleGrid>

                          <Box>
                            <Text fontSize="sm" fontWeight="bold" mb={2}>
                              Top Genres:
                            </Text>
                            <VStack align="stretch" spacing={1}>
                              {data.stats.topGenres.slice(0, 3).map(genre => (
                                <HStack key={genre.genre} justify="space-between">
                                  <Text fontSize="sm">{genre.genre}</Text>
                                  <Badge>{genre.plays}</Badge>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </TabPanel>

                {/* Song Overlap Tab */}
                <TabPanel p={0} pt={4}>
                  <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
                    <Box bg="brand.500" px={6} py={4}>
                      <Heading size="md" color="white">
                        Songs Played on Multiple Stations ({overlapSongs.length})
                      </Heading>
                    </Box>
                    {overlapSongs.length > 0 ? (
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Song</Th>
                              <Th>Artist</Th>
                              <Th isNumeric>Stations</Th>
                              <Th isNumeric>Total Plays</Th>
                              <Th>Played On</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {overlapSongs.map(song => (
                              <Tr key={song.id}>
                                <Td>
                                  <Text fontWeight="semibold">{song.title}</Text>
                                </Td>
                                <Td>{song.artist}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme="purple">{song.stationCount}</Badge>
                                </Td>
                                <Td isNumeric>
                                  <Badge colorScheme="green">{song.totalPlays}</Badge>
                                </Td>
                                <Td>
                                  <HStack spacing={1} flexWrap="wrap">
                                    {song.stations.slice(0, 3).map(station => (
                                      <Badge key={station} size="sm" variant="subtle">
                                        {station}
                                      </Badge>
                                    ))}
                                    {song.stations.length > 3 && (
                                      <Badge size="sm" variant="subtle">
                                        +{song.stations.length - 3}
                                      </Badge>
                                    )}
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    ) : (
                      <Box py={12} textAlign="center">
                        <Text color="gray.500">No overlapping songs found</Text>
                      </Box>
                    )}
                  </Box>
                </TabPanel>

                {/* Unique Songs Tab */}
                <TabPanel p={0} pt={4}>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    {statsData.map(data => (
                      <Box
                        key={data.station.id}
                        bg={cardBg}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                        overflow="hidden"
                      >
                        <Box bg="purple.500" px={6} py={3}>
                          <Heading size="sm" color="white">
                            Unique to {data.station.name}
                          </Heading>
                        </Box>
                        {uniqueSongs[data.station.id]?.length > 0 ? (
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>Song</Th>
                                <Th>Artist</Th>
                                <Th isNumeric>Plays</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {uniqueSongs[data.station.id].map(song => (
                                <Tr key={song.id}>
                                  <Td>
                                    <Text fontSize="sm" fontWeight="medium">
                                      {song.title}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm">{song.artist}</Text>
                                  </Td>
                                  <Td isNumeric>
                                    <Badge size="sm">{song.playCount}</Badge>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        ) : (
                          <Box py={8} textAlign="center">
                            <Text fontSize="sm" color="gray.500">
                              No unique songs
                            </Text>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </SimpleGrid>
                </TabPanel>

                {/* Timeline Tab */}
                <TabPanel p={0} pt={4}>
                  <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    <Heading size="md" mb={4}>
                      Play Activity Over Time (Last 7 Days)
                    </Heading>
                    {timeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={prepareTimelineData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {timeline.map((t, idx) => (
                            <Line
                              key={t.stationId}
                              type="monotone"
                              dataKey={t.stationName}
                              stroke={COLORS[idx % COLORS.length]}
                              strokeWidth={2}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box textAlign="center" py={12}>
                        <Text color="gray.500">No timeline data available</Text>
                      </Box>
                    )}
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : hasCompared ? (
            <Box textAlign="center" py={12} bg={cardBg} borderRadius="lg">
              <Text color="gray.500" fontSize="lg">
                No data available for the selected stations
              </Text>
            </Box>
          ) : (
            <Box textAlign="center" py={12}>
              <Text color="gray.500" fontSize="lg">
                Select at least 2 stations and click Compare to get started
              </Text>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
