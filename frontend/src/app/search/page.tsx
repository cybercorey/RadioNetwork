'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
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
  Link as ChakraLink,
  SimpleGrid,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FaSearch, FaMusic, FaMicrophone, FaBroadcastTower, FaTimes, FaFlag } from 'react-icons/fa';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/services/api';

interface Song {
  id: number;
  title: string;
  artist: string;
  isNonSong: boolean;
  nonSongType?: string;
  playCount?: number;
}

interface Play {
  id: string;
  playedAt: string;
  song: Song;
  station: {
    id: number;
    name: string;
    slug: string;
    tags: string[];
  };
}

interface Station {
  id: number;
  name: string;
  slug: string;
  tags: string[];
  isActive: boolean;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'songs' | 'artists' | 'stations'>('all');
  const [songs, setSongs] = useState<Song[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
      setSongs(response.data.songs || []);
      setPlays(response.data.plays || []);
      setStations(response.data.stations || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsNonSong = async (songId: number, type: string) => {
    try {
      await api.patch(`/songs/${songId}/mark-non-song`, { type });
      // Refresh search results
      handleSearch();
    } catch (error) {
      console.error('Failed to mark as non-song:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <HStack justify="center" mb={2}>
              <FaSearch size={32} />
              <Heading size="2xl">Search</Heading>
            </HStack>
            <Text fontSize="lg" color="gray.500">
              Search across songs, artists, stations, and play history
            </Text>
          </Box>

          {/* Search Bar */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4}>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none">
                  <FaSearch color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search for songs, artists, or stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  fontSize="lg"
                />
              </InputGroup>

              <HStack w="full" justify="space-between">
                <Select value={searchType} onChange={(e) => setSearchType(e.target.value as any)} maxW="200px">
                  <option value="all">All</option>
                  <option value="songs">Songs Only</option>
                  <option value="artists">Artists Only</option>
                  <option value="stations">Stations Only</option>
                </Select>

                <HStack>
                  {searchQuery && (
                    <IconButton
                      aria-label="Clear search"
                      icon={<FaTimes />}
                      onClick={() => {
                        setSearchQuery('');
                        setSongs([]);
                        setPlays([]);
                        setStations([]);
                        setHasSearched(false);
                      }}
                      variant="ghost"
                    />
                  )}
                  <Button
                    colorScheme="brand"
                    size="lg"
                    leftIcon={<FaSearch />}
                    onClick={handleSearch}
                    isLoading={isLoading}
                    isDisabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </HStack>
              </HStack>
            </VStack>
          </Box>

          {/* Results */}
          {isLoading ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" color="brand.500" mb={4} />
              <Text>Searching...</Text>
            </Box>
          ) : hasSearched ? (
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>
                  <FaMusic style={{ marginRight: '8px' }} />
                  Songs ({songs.length})
                </Tab>
                <Tab>
                  <FaBroadcastTower style={{ marginRight: '8px' }} />
                  Stations ({stations.length})
                </Tab>
                <Tab>Recent Plays ({plays.length})</Tab>
              </TabList>

              <TabPanels>
                {/* Songs Tab */}
                <TabPanel p={0} pt={4}>
                  {songs.length > 0 ? (
                    <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Song</Th>
                            <Th>Artist</Th>
                            <Th isNumeric>Play Count</Th>
                            <Th>Type</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {songs.map((song) => (
                            <Tr key={song.id}>
                              <Td>
                                <ChakraLink as={Link} href={`/songs/${song.id}`} fontWeight="semibold" color="brand.500">
                                  {song.title}
                                </ChakraLink>
                              </Td>
                              <Td>{song.artist}</Td>
                              <Td isNumeric>{song.playCount?.toLocaleString() || 0}</Td>
                              <Td>
                                {song.isNonSong ? (
                                  <Badge colorScheme="orange">
                                    {song.nonSongType || 'Non-Song'}
                                  </Badge>
                                ) : (
                                  <Badge colorScheme="green">Song</Badge>
                                )}
                              </Td>
                              <Td>
                                {!song.isNonSong && (
                                  <HStack spacing={2}>
                                    <Tooltip label="Mark as Show/Program">
                                      <IconButton
                                        aria-label="Mark as show"
                                        icon={<FaFlag />}
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleMarkAsNonSong(song.id, 'show')}
                                      />
                                    </Tooltip>
                                  </HStack>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={12} bg={cardBg} borderRadius="lg">
                      <Text color="gray.500">No songs found</Text>
                    </Box>
                  )}
                </TabPanel>

                {/* Stations Tab */}
                <TabPanel p={0} pt={4}>
                  {stations.length > 0 ? (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {stations.map((station) => (
                        <Box
                          key={station.id}
                          as={Link}
                          href={`/stations/${station.slug}`}
                          bg={cardBg}
                          p={6}
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor={borderColor}
                          _hover={{ borderColor: 'brand.500', transform: 'translateY(-2px)' }}
                          transition="all 0.2s"
                        >
                          <VStack align="start" spacing={3}>
                            <Heading size="md">{station.name}</Heading>
                            <HStack spacing={2} flexWrap="wrap">
                              {station.tags.map((tag) => (
                                <Badge key={tag} colorScheme="blue">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>
                            <Badge colorScheme={station.isActive ? 'green' : 'gray'}>
                              {station.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </VStack>
                        </Box>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Box textAlign="center" py={12} bg={cardBg} borderRadius="lg">
                      <Text color="gray.500">No stations found</Text>
                    </Box>
                  )}
                </TabPanel>

                {/* Recent Plays Tab */}
                <TabPanel p={0} pt={4}>
                  {plays.length > 0 ? (
                    <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Time</Th>
                            <Th>Song</Th>
                            <Th>Artist</Th>
                            <Th>Station</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {plays.map((play) => (
                            <Tr key={play.id}>
                              <Td>
                                <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                                  {format(new Date(play.playedAt), 'MMM d, h:mm a')}
                                </Text>
                              </Td>
                              <Td>
                                <ChakraLink
                                  as={Link}
                                  href={`/songs/${play.song.id}`}
                                  fontWeight="semibold"
                                  color="brand.500"
                                >
                                  {play.song.title}
                                </ChakraLink>
                              </Td>
                              <Td>{play.song.artist}</Td>
                              <Td>
                                <ChakraLink as={Link} href={`/stations/${play.station.slug}`}>
                                  {play.station.name}
                                </ChakraLink>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={12} bg={cardBg} borderRadius="lg">
                      <Text color="gray.500">No recent plays found</Text>
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : (
            <Box textAlign="center" py={12}>
              <Text color="gray.500" fontSize="lg">
                Enter a search query to get started
              </Text>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
