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
  Select,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaArrowLeft, FaFire, FaTrophy, FaMusic, FaClock, FaRandom, FaGuitar } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';

interface PlaylistSong {
  id: number;
  title: string;
  artist: string;
  playCount?: number;
  recentPlays?: number;
  momentum?: number;
  lastPlayed?: string;
  firstPlayed?: string;
  stationCount?: number;
  stations?: string[];
  similarity_score?: number;
}

interface Playlist {
  songs: PlaylistSong[];
  timeRange?: string;
  period?: string;
  criteria?: string;
  yearsAgo?: number;
  genre?: string;
}

export default function PlaylistsPage() {
  const [trending, setTrending] = useState<Playlist | null>(null);
  const [weeklyTop, setWeeklyTop] = useState<Playlist | null>(null);
  const [discover, setDiscover] = useState<Playlist | null>(null);
  const [throwback, setThrowback] = useState<Playlist | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('Rock');
  const [genrePlaylist, setGenrePlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const genres = ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Alternative', 'Classic Rock', 'R&B', 'Dance'];

  useEffect(() => {
    fetchPlaylists();
    const interval = setInterval(fetchPlaylists, 300000); // Poll every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedGenre) {
      fetchGenrePlaylist(selectedGenre);
    }
  }, [selectedGenre]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const [trendingRes, weeklyRes, discoverRes, throwbackRes] = await Promise.all([
        api.get('/playlists/trending?limit=50'),
        api.get('/playlists/weekly-top?limit=50'),
        api.get('/playlists/discover?limit=30'),
        api.get('/playlists/throwback?years=1&limit=30'),
      ]);

      setTrending(trendingRes.data);
      setWeeklyTop(weeklyRes.data);
      setDiscover(discoverRes.data);
      setThrowback(throwbackRes.data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGenrePlaylist = async (genre: string) => {
    try {
      const response = await api.get(`/playlists/genre/${encodeURIComponent(genre)}?limit=50`);
      setGenrePlaylist(response.data);
    } catch (error) {
      console.error(`Failed to fetch ${genre} playlist:`, error);
    }
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading playlists...</Text>
        </VStack>
      </Box>
    );
  }

  const PlaylistTable = ({ songs, type }: { songs: PlaylistSong[]; type: string }) => (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th isNumeric>#</Th>
            <Th>Song</Th>
            <Th>Artist</Th>
            {type === 'trending' && <Th isNumeric>Momentum</Th>}
            {(type === 'weekly' || type === 'genre') && <Th isNumeric>Plays</Th>}
            {type === 'discover' && <Th>First Played</Th>}
            {type === 'discover' && <Th isNumeric>Stations</Th>}
            {type === 'throwback' && <Th>Period</Th>}
            <Th>Last Played</Th>
          </Tr>
        </Thead>
        <Tbody>
          {songs.map((song, index) => (
            <Tr key={song.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
              <Td isNumeric fontWeight="bold" color="gray.500">
                {index + 1}
              </Td>
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
              {type === 'trending' && (
                <Td isNumeric>
                  <Badge colorScheme="red" fontSize="sm" px={2}>
                    +{song.momentum}
                  </Badge>
                </Td>
              )}
              {(type === 'weekly' || type === 'genre') && (
                <Td isNumeric>
                  <Badge colorScheme="purple" fontSize="sm" px={2}>
                    {song.playCount}
                  </Badge>
                </Td>
              )}
              {type === 'discover' && (
                <>
                  <Td>
                    <Text fontSize="sm" color="gray.500">
                      {song.firstPlayed && format(new Date(song.firstPlayed), 'MMM d, yyyy')}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Badge colorScheme="green" fontSize="sm">
                      {song.stationCount}
                    </Badge>
                  </Td>
                </>
              )}
              {type === 'throwback' && (
                <Td>
                  <Text fontSize="sm" color="gray.500">
                    {song.firstPlayed && format(new Date(song.firstPlayed), 'MMM d, yyyy')}
                  </Text>
                </Td>
              )}
              <Td>
                <Text fontSize="sm" color="gray.500">
                  {song.lastPlayed && format(new Date(song.lastPlayed), 'MMM d, h:mm a')}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      {songs.length === 0 && (
        <Box p={8} textAlign="center">
          <Text color="gray.500">No songs found in this playlist</Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <HStack mb={2}>
                <FaMusic size={32} />
                <Heading size="xl">Smart Playlists</Heading>
              </HStack>
              <Text color="gray.500">Discover trending songs and personalized playlists</Text>
            </Box>
            <Button as={Link} href="/" leftIcon={<FaArrowLeft />} variant="ghost">
              Back
            </Button>
          </HStack>

          {/* Playlists Tabs */}
          <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaFire} />
                    <Text>Trending</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaTrophy} />
                    <Text>Weekly Top</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaRandom} />
                    <Text>Discover</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaClock} />
                    <Text>Throwback</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FaGuitar} />
                    <Text>By Genre</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Trending */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Trending Songs
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          Songs gaining momentum {trending?.timeRange}
                        </Text>
                      </Box>
                      {trending && <PlaylistTable songs={trending.songs} type="trending" />}
                    </VStack>
                  </Box>
                </TabPanel>

                {/* Weekly Top */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Weekly Top Songs
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          {weeklyTop?.period}
                        </Text>
                      </Box>
                      {weeklyTop && <PlaylistTable songs={weeklyTop.songs} type="weekly" />}
                    </VStack>
                  </Box>
                </TabPanel>

                {/* Discover */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Discover New Music
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          {discover?.criteria}
                        </Text>
                      </Box>
                      {discover && <PlaylistTable songs={discover.songs} type="discover" />}
                    </VStack>
                  </Box>
                </TabPanel>

                {/* Throwback */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="md" mb={2}>
                          Throwback Thursday
                        </Heading>
                        <Text color="gray.500" fontSize="sm">
                          Songs from {throwback?.period}
                        </Text>
                      </Box>
                      {throwback && <PlaylistTable songs={throwback.songs} type="throwback" />}
                    </VStack>
                  </Box>
                </TabPanel>

                {/* By Genre */}
                <TabPanel p={0}>
                  <Box p={6}>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between">
                        <Box>
                          <Heading size="md" mb={2}>
                            {selectedGenre} Playlist
                          </Heading>
                          <Text color="gray.500" fontSize="sm">
                            Top {selectedGenre} songs {genrePlaylist?.timeRange}
                          </Text>
                        </Box>
                        <Select
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          w="200px"
                        >
                          {genres.map((genre) => (
                            <option key={genre} value={genre}>
                              {genre}
                            </option>
                          ))}
                        </Select>
                      </HStack>
                      {genrePlaylist && <PlaylistTable songs={genrePlaylist.songs} type="genre" />}
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
