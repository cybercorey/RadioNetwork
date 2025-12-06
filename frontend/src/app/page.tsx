'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Spinner,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { useStations } from '@/hooks/useStations';
import { useSocket } from '@/hooks/useSocket';
import Link from 'next/link';
import { FaMusic, FaBroadcastTower } from 'react-icons/fa';
import { Song } from '@/types/song';
import { Station } from '@/types/station';
import api from '@/services/api';
import { format } from 'date-fns';

interface StationWithSong extends Station {
  currentSong?: Song | null;
  playedAt?: string | null;
}

export default function Home() {
  const { stations, isLoading } = useStations();
  const socket = useSocket();
  const [stationsWithSongs, setStationsWithSongs] = useState<StationWithSong[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch current songs for all stations
  useEffect(() => {
    if (!stations.length) return;

    const fetchCurrentSongs = async () => {
      const stationsWithCurrentSongs = await Promise.all(
        stations.map(async (station: Station) => {
          try {
            const response = await api.get(`/stations/${station.slug}/current`);
            return {
              ...station,
              currentSong: response.data.currentSong,
              playedAt: response.data.playedAt,
            } as StationWithSong;
          } catch (error) {
            return {
              ...station,
              currentSong: null,
              playedAt: null,
            } as StationWithSong;
          }
        })
      );
      setStationsWithSongs(stationsWithCurrentSongs);
    };

    fetchCurrentSongs();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentSongs, 30000);
    return () => clearInterval(interval);
  }, [stations]);

  // Listen for real-time updates via socket
  useEffect(() => {
    if (!socket) return;

    socket.on('globalNewSong', (data: any) => {
      setStationsWithSongs((prev: StationWithSong[]) =>
        prev.map((station: StationWithSong) =>
          station.id === data.station.id
            ? { ...station, currentSong: data.song, playedAt: data.playedAt }
            : station
        )
      );
      setLastUpdated(new Date());
    });

    return () => {
      socket.off('globalNewSong');
    };
  }, [socket]);

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
              <FaMusic style={{ display: 'inline', marginRight: '12px' }} />
              RadioNetwork v2
            </Heading>
            <Text fontSize="xl" color="gray.500">
              Live Radio Station Tracking
            </Text>
            {lastUpdated && (
              <Text fontSize="sm" color="gray.400" mt={2}>
                Last updated: {format(lastUpdated, 'h:mm:ss a')}
              </Text>
            )}
          </Box>

          {/* Now Playing List */}
          <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
            <Box bg="brand.500" px={6} py={4}>
              <HStack>
                <FaBroadcastTower color="white" />
                <Heading size="md" color="white">
                  Now Playing Across All Stations
                </Heading>
              </HStack>
            </Box>

            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Station</Th>
                    <Th>Current Song</Th>
                    <Th>Artist</Th>
                    <Th>Started</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {stationsWithSongs.map((station: StationWithSong) => (
                    <Tr
                      key={station.id}
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                      cursor="pointer"
                    >
                      <Td>
                        <ChakraLink as={Link} href={`/stations/${station.slug}`} fontWeight="semibold">
                          {station.name}
                        </ChakraLink>
                        <HStack mt={1} spacing={1}>
                          {station.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} size="sm" variant="subtle" colorScheme="blue">
                              {tag}
                            </Badge>
                          ))}
                        </HStack>
                      </Td>
                      <Td>
                        {station.currentSong ? (
                          <Text fontWeight="medium">{station.currentSong.title}</Text>
                        ) : (
                          <Text color="gray.400" fontStyle="italic">
                            No data
                          </Text>
                        )}
                      </Td>
                      <Td>
                        {station.currentSong ? (
                          <Text>{station.currentSong.artist}</Text>
                        ) : (
                          <Text color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td>
                        {station.playedAt ? (
                          <Text fontSize="sm" color="gray.500">
                            {format(new Date(station.playedAt), 'h:mm a')}
                          </Text>
                        ) : (
                          <Text color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td>
                        {station.currentSong && station.isActive ? (
                          <Badge colorScheme="green" display="flex" alignItems="center" gap={1}>
                            <Box as="span" w={2} h={2} bg="green.400" borderRadius="full" />
                            Live
                          </Badge>
                        ) : station.isActive && !station.currentSong ? (
                          <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1}>
                            <Box as="span" w={2} h={2} bg="yellow.400" borderRadius="full" />
                            No Data
                          </Badge>
                        ) : (
                          <Badge colorScheme="gray">Offline</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Stats */}
          <HStack spacing={4} justify="center" flexWrap="wrap">
            <Box bg={cardBg} px={6} py={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Text fontSize="sm" color="gray.500">
                Total Stations
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                {stations.length}
              </Text>
            </Box>
            <Box bg={cardBg} px={6} py={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Text fontSize="sm" color="gray.500">
                Currently Playing
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {stationsWithSongs.filter((s: StationWithSong) => s.currentSong).length}
              </Text>
            </Box>
            <Box bg={cardBg} px={6} py={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Text fontSize="sm" color="gray.500">
                Active Stations
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                {stations.filter((s: Station) => s.isActive).length}
              </Text>
            </Box>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}
