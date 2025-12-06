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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  useColorModeValue,
  Select,
  Button,
} from '@chakra-ui/react';
import { FaChartLine, FaArrowLeft, FaTrophy, FaClock, FaMusic } from 'react-icons/fa';
import Link from 'next/link';
import { useRefresh } from '@/context/RefreshContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  totalPlays: number;
  totalSongs: number;
  uniqueArtists: number;
  activeStations: number;
  playsOverTime: { date: string; plays: number }[];
  topSongs: { song: string; artist: string; plays: number }[];
  topArtists: { artist: string; plays: number }[];
  playsByStation: { station: string; plays: number }[];
  playsByGenre: { genre: string; plays: number }[];
  playsByHour: { hour: number; plays: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('7d');
  const { setRefreshing, updateTimestamp } = useRefresh();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    fetchAnalytics();
    // Poll every 5 minutes for updated analytics
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setRefreshing(true);
    try {
      const response = await api.get(`/analytics/dashboard?timeRange=${timeRange}`);
      setData(response.data);
      updateTimestamp();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading analytics...</Text>
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
                <Heading size="xl">Analytics Dashboard</Heading>
              </HStack>
              <Text color="gray.500">Insights into your radio network</Text>
            </Box>
            <HStack>
              <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} w="200px">
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </Select>
              <Button as={Link} href="/" leftIcon={<FaArrowLeft />} variant="ghost">
                Back
              </Button>
            </HStack>
          </HStack>

          {/* Key Metrics */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel fontSize="sm">Total Plays</StatLabel>
                <StatNumber color="brand.500">{data.totalPlays.toLocaleString()}</StatNumber>
                <StatHelpText>
                  <FaMusic style={{ display: 'inline', marginRight: '4px' }} />
                  All time
                </StatHelpText>
              </Stat>
            </Box>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel fontSize="sm">Unique Songs</StatLabel>
                <StatNumber color="purple.500">{data.totalSongs.toLocaleString()}</StatNumber>
                <StatHelpText>Tracked</StatHelpText>
              </Stat>
            </Box>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel fontSize="sm">Artists</StatLabel>
                <StatNumber color="green.500">{data.uniqueArtists.toLocaleString()}</StatNumber>
                <StatHelpText>Unique</StatHelpText>
              </Stat>
            </Box>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel fontSize="sm">Active Stations</StatLabel>
                <StatNumber color="orange.500">{data.activeStations}</StatNumber>
                <StatHelpText>Currently tracking</StatHelpText>
              </Stat>
            </Box>
          </SimpleGrid>

          {/* Plays Over Time */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Heading size="md" mb={4}>
              <FaClock style={{ display: 'inline', marginRight: '8px' }} />
              Plays Over Time
            </Heading>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.playsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="plays" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Two Column Charts */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Top Songs */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>
                <FaTrophy style={{ display: 'inline', marginRight: '8px' }} />
                Top Songs
              </Heading>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topSongs.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="song" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Top Artists */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>
                Top Artists
              </Heading>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topArtists.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="artist" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {/* Plays by Station */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>
                Plays by Station
              </Heading>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.playsByStation}
                    dataKey="plays"
                    nameKey="station"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {data.playsByStation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Plays by Hour */}
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>
                Plays by Hour of Day
              </Heading>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.playsByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SimpleGrid>

          {/* Plays by Genre */}
          {data.playsByGenre.length > 0 && (
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Heading size="md" mb={4}>
                Plays by Genre
              </Heading>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.playsByGenre}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="genre" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="plays" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
