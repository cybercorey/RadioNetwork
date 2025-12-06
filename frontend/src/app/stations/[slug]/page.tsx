'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useStation, useCurrentSong } from '@/hooks/useStations';
import { useSocket } from '@/hooks/useSocket';
import { Song } from '@/types/song';
import { Play } from '@/types/play';
import Link from 'next/link';
import { FaArrowLeft, FaMusic } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';

export default function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const { station, isLoading } = useStation(slug || '');
  const { data: currentData, mutate } = useCurrentSong(slug || '');
  const socket = useSocket();
  const [history, setHistory] = useState<Play[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (currentData?.currentSong) {
      setCurrentSong(currentData.currentSong);
    }
  }, [currentData]);

  useEffect(() => {
    if (station && slug) {
      // Fetch history
      api.get(`/stations/${slug}/history?limit=50`).then((res) => {
        setHistory(res.data.plays);
      });
    }
  }, [station, slug]);

  useEffect(() => {
    if (!socket || !station) return;

    // Join station room
    socket.emit('join', `station:${station.id}`);

    // Listen for new songs
    socket.on('newSong', (data: any) => {
      if (data.station.id === station.id) {
        setCurrentSong(data.song);
        setLastUpdated(new Date());
        setHistory((prev) => [{
          id: data.play.id,
          stationId: data.station.id,
          songId: data.song.id,
          playedAt: data.playedAt,
          createdAt: data.playedAt,  // Required by Play type
          song: data.song,
        }, ...prev.slice(0, 49)]);
      }
    });

    return () => {
      socket.emit('leave', `station:${station.id}`);
      socket.off('newSong');
    };
  }, [socket, station]);

  if (isLoading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  if (!station) {
    return (
      <Box minH="100vh" bg={bgColor} py={8}>
        <Container maxW="container.xl">
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Station not found</AlertTitle>
            <AlertDescription>The requested station could not be found.</AlertDescription>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack>
            <Button
              as={Link}
              href="/"
              leftIcon={<FaArrowLeft />}
              variant="ghost"
            >
              Back
            </Button>
          </HStack>

          {/* Station Info */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="xl">{station.name}</Heading>
                {station.isActive && <Badge colorScheme="green" fontSize="md">Live</Badge>}
              </HStack>
              <HStack wrap="wrap" spacing={2}>
                {station.tags.map((tag) => (
                  <Badge key={tag} colorScheme="blue">
                    {tag}
                  </Badge>
                ))}
              </HStack>
            </VStack>
          </Box>

          {/* Now Playing */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth={2} borderColor="brand.500">
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <HStack>
                  <FaMusic />
                  <Heading size="lg">Now Playing</Heading>
                </HStack>
                {lastUpdated && (
                  <Text fontSize="xs" color="gray.400">
                    Last updated: {format(lastUpdated, 'h:mm:ss a')}
                  </Text>
                )}
              </HStack>
              {currentSong ? (
                <VStack align="start" spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {currentSong.title}
                  </Text>
                  <Text fontSize="xl" color="gray.500">
                    {currentSong.artist}
                  </Text>
                  {currentData?.playedAt && (
                    <Text fontSize="sm" color="gray.400">
                      Started: {format(new Date(currentData.playedAt), 'h:mm a')}
                    </Text>
                  )}
                </VStack>
              ) : (
                <Text color="gray.500">No song currently playing</Text>
              )}
            </VStack>
          </Box>

          {/* History */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack align="stretch" spacing={4}>
              <Heading size="lg">Recent Plays</Heading>
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Time</Th>
                      <Th>Artist</Th>
                      <Th>Title</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {history.map((play) => (
                      <Tr key={play.id}>
                        <Td>{format(new Date(play.playedAt), 'h:mm a')}</Td>
                        <Td>{play.song?.artist}</Td>
                        <Td>{play.song?.title}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
