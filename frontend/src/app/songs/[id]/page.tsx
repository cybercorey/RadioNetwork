'use client';

import { use, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Button,
  Badge,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
  Link as ChakraLink,
  Divider,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaArrowLeft, FaMusic, FaSpotify, FaExternalLinkAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';

interface Song {
  id: number;
  title: string;
  artist: string;
  createdAt: string;
  isNonSong?: boolean;
  nonSongType?: string | null;
}

interface Station {
  id: number;
  name: string;
  slug: string;
  tags: string[];
}

interface SongStats {
  totalPlays: number;
  playsByStation: {
    station: Station;
    playCount: number;
  }[];
  firstPlayed: string;
  lastPlayed: string;
  playsByDay: { [key: string]: number };
}

export default function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: songId } = use(params);
  const [song, setSong] = useState<Song | null>(null);
  const [stats, setStats] = useState<SongStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (songId) {
      fetchSongData();
    }
  }, [songId]);

  useEffect(() => {
    if (song) {
      // Generate Spotify search URL
      const searchQuery = encodeURIComponent(`${song.artist} ${song.title}`);
      setSpotifyUrl(`https://open.spotify.com/search/${searchQuery}`);
    }
  }, [song]);

  const fetchSongData = async () => {
    if (!songId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/songs/${songId}/stats`);
      setSong(response.data.song);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch song data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading song details...</Text>
        </VStack>
      </Box>
    );
  }

  if (!song || !stats) {
    return (
      <Box minH="100vh" bg={bgColor} py={8}>
        <Container maxW="container.xl">
          <Alert status="error">
            <AlertIcon />
            Song not found
          </Alert>
        </Container>
      </Box>
    );
  }

  // Prepare chart data
  const playsByDayArray = Object.entries(stats.playsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Button
              as={Link}
              href="/plays"
              leftIcon={<FaArrowLeft />}
              variant="ghost"
            >
              Back to Plays
            </Button>
            {spotifyUrl && (
              <Button
                as="a"
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<FaSpotify />}
                colorScheme="green"
                size="sm"
              >
                Search on Spotify
              </Button>
            )}
          </HStack>

          {/* Song Info */}
          <Box bg={cardBg} p={8} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack align="start" spacing={4}>
              <HStack>
                <FaMusic size={32} color="var(--chakra-colors-brand-500)" />
                <VStack align="start" spacing={1}>
                  <HStack spacing={3}>
                    <Heading size="2xl">{song.title}</Heading>
                    {song.isNonSong && (
                      <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                        {song.nonSongType?.toUpperCase() || 'SHOW'}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xl" color="gray.500">
                    {song.artist}
                  </Text>
                </VStack>
              </HStack>
              <Divider />
              <HStack spacing={8} flexWrap="wrap">
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    First Played
                  </Text>
                  <Text fontWeight="semibold">
                    {format(new Date(stats.firstPlayed), 'MMM d, yyyy h:mm a')}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Last Played
                  </Text>
                  <Text fontWeight="semibold">
                    {format(new Date(stats.lastPlayed), 'MMM d, yyyy h:mm a')}
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Box>

          {/* Stats Grid */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel>Total Plays</StatLabel>
                <StatNumber color="brand.500">{stats.totalPlays}</StatNumber>
                <StatHelpText>Across all stations</StatHelpText>
              </Stat>
            </Box>

            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel>Stations</StatLabel>
                <StatNumber color="purple.500">{stats.playsByStation.length}</StatNumber>
                <StatHelpText>Playing this song</StatHelpText>
              </Stat>
            </Box>

            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Stat>
                <StatLabel>Most Popular On</StatLabel>
                <StatNumber fontSize="lg" color="green.500">
                  {stats.playsByStation[0]?.station.name || 'N/A'}
                </StatNumber>
                <StatHelpText>
                  {stats.playsByStation[0]?.playCount || 0} plays
                </StatHelpText>
              </Stat>
            </Box>
          </SimpleGrid>

          {/* Play Activity (Last 30 Days) */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Heading size="md" mb={4}>
              Play Activity (Last 30 Days)
            </Heading>
            {playsByDayArray.length > 0 ? (
              <Box overflowX="auto">
                <HStack spacing={2} align="end" h="200px">
                  {playsByDayArray.map(({ date, count }) => {
                    const maxCount = Math.max(...playsByDayArray.map((d) => d.count));
                    const height = (count / maxCount) * 100;
                    return (
                      <VStack key={date} spacing={1} flex="1" minW="30px">
                        <Text fontSize="xs" fontWeight="bold" color="gray.500">
                          {count}
                        </Text>
                        <Box
                          bg="brand.500"
                          w="100%"
                          h={`${height}%`}
                          borderRadius="sm"
                          minH="2px"
                          title={`${date}: ${count} plays`}
                        />
                        <Text fontSize="xs" color="gray.500" transform="rotate(-45deg)" mt={2}>
                          {format(new Date(date), 'MMM d')}
                        </Text>
                      </VStack>
                    );
                  })}
                </HStack>
              </Box>
            ) : (
              <Text color="gray.500">No plays in the last 30 days</Text>
            )}
          </Box>

          {/* Plays by Station */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Heading size="md" mb={4}>
              Plays by Station
            </Heading>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Station</Th>
                  <Th>Tags</Th>
                  <Th isNumeric>Play Count</Th>
                  <Th isNumeric>Percentage</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stats.playsByStation.map(({ station, playCount }) => (
                  <Tr key={station.id}>
                    <Td>
                      <ChakraLink
                        as={Link}
                        href={`/stations/${station.slug}`}
                        fontWeight="semibold"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {station.name}
                      </ChakraLink>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        {station.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} size="sm" variant="subtle" colorScheme="blue">
                            {tag}
                          </Badge>
                        ))}
                      </HStack>
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      {playCount}
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme="green">
                        {((playCount / stats.totalPlays) * 100).toFixed(1)}%
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* External Links */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Heading size="md" mb={4}>
              External Links
            </Heading>
            <VStack align="start" spacing={3}>
              {spotifyUrl && (
                <Button
                  as="a"
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftIcon={<FaSpotify />}
                  colorScheme="green"
                  variant="outline"
                  w="full"
                >
                  Search on Spotify
                </Button>
              )}
              <Button
                as="a"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${song.artist} ${song.title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<FaExternalLinkAlt />}
                colorScheme="red"
                variant="outline"
                w="full"
              >
                Search on YouTube
              </Button>
              <Button
                as="a"
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `${song.artist} ${song.title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                leftIcon={<FaExternalLinkAlt />}
                colorScheme="blue"
                variant="outline"
                w="full"
              >
                Search on Google
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
