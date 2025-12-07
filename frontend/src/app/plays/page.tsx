'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Input,
  Select,
  useColorModeValue,
  Link as ChakraLink,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Textarea,
  Divider,
  Checkbox,
  CheckboxGroup,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaArrowLeft, FaHistory, FaSearch, FaSpotify, FaFileExport, FaDatabase } from 'react-icons/fa';
import { format } from 'date-fns';
import api from '@/services/api';
import { useStations } from '@/hooks/useStations';
import { useRefresh } from '@/context/RefreshContext';
import { useLegacyMode } from '@/context/LegacyModeContext';

interface Play {
  id: string;
  stationId: number;
  songId: number;
  playedAt: string;
  playCount?: number;
  rawMetadata?: {
    legacyStation?: string;
    migratedAt?: string;
  };
  song: {
    id: number;
    title: string;
    artist: string;
    isNonSong?: boolean;
    nonSongType?: string | null;
  };
  station: {
    id: number;
    name: string;
    slug: string;
    tags: string[];
  };
}

type ContentFilter = 'songs' | 'shows' | 'all';

interface DatabaseStats {
  totalPlays: number;
  totalSongs: number;
  totalStations: number;
  uniqueArtists: number;
}

type SortMode = 'recent' | 'most-played' | 'song' | 'artist' | 'station';

// Legacy mode month options
const MONTHS = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const LEGACY_YEARS = ['2013', '2014', '2015'];

export default function PlaysPage() {
  const [plays, setPlays] = useState<Play[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortMode>('recent');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [contentFilter, setContentFilter] = useState<ContentFilter>('songs');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const limit = 50;

  const { stations } = useStations();
  const { setRefreshing, updateTimestamp } = useRefresh();
  const { isLegacyMode } = useLegacyMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [spotifyUrls, setSpotifyUrls] = useState('');
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch database stats when legacy mode changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sourceParam = isLegacyMode ? 'v1' : 'all';
        const response = await api.get(`/plays/stats?source=${sourceParam}`);
        setDbStats(response.data);
      } catch (error) {
        console.error('Failed to fetch database stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 120000); // Poll every 2 minutes
    return () => clearInterval(interval);
  }, [isLegacyMode]);

  // Reset page and date filter when legacy mode changes
  useEffect(() => {
    setPage(0);
    setDateFilter('all'); // Reset to 'all' since filter options are different per mode
    setSelectedYears([]);
    setSelectedMonths([]);
  }, [isLegacyMode]);

  // Fetch plays when filters or page change, and poll every minute
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setRefreshing(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: (page * limit).toString(),
          filter: contentFilter,
          source: isLegacyMode ? 'v1' : 'all',
        });

        if (stationFilter !== 'all') params.append('station', stationFilter);

        // Use legacy year/month filters or modern dateFilter
        if (isLegacyMode) {
          if (selectedYears.length > 0) params.append('years', selectedYears.join(','));
          if (selectedMonths.length > 0) params.append('months', selectedMonths.join(','));
        } else {
          if (dateFilter !== 'all') params.append('dateFilter', dateFilter);
        }

        if (sortBy === 'most-played') {
          const response = await api.get(`/plays/most-played?${params.toString()}`);
          const transformedPlays = response.data.results.map((item: any) => ({
            id: `${item.song.id}-most-played`,
            songId: item.song.id,
            playCount: item.playCount,
            song: item.song,
            station: item.latestPlay?.station || {},
            playedAt: item.latestPlay?.playedAt || new Date().toISOString(),
            stationId: item.latestPlay?.station?.id || 0,
          }));
          setPlays(transformedPlays);
          setTotalCount(response.data.pagination.total);
        } else {
          const response = await api.get(`/plays/recent?${params.toString()}`);
          setPlays(response.data.plays);
          setTotalCount(response.data.pagination.total);
        }
        updateTimestamp();
      } catch (error) {
        console.error('Failed to fetch plays:', error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [page, stationFilter, dateFilter, selectedYears, selectedMonths, sortBy, contentFilter, isLegacyMode, setRefreshing, updateTimestamp]);

  // Get all unique genres
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    stations.forEach(station => {
      station.tags.forEach(tag => genres.add(tag));
    });
    return Array.from(genres).sort();
  }, [stations]);

  // Client-side filter and sort (since we have a page of data)
  const filteredAndSortedPlays = useMemo(() => {
    let filtered = [...plays];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (play: Play) =>
          play.song.title.toLowerCase().includes(query) ||
          play.song.artist.toLowerCase().includes(query) ||
          play.station.name.toLowerCase().includes(query)
      );
    }

    // Apply genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter((play: Play) =>
        play.station.tags.includes(genreFilter)
      );
    }

    // Apply sorting (for client-side sort modes only)
    switch (sortBy) {
      case 'song':
        filtered.sort((a: Play, b: Play) => a.song.title.localeCompare(b.song.title));
        break;
      case 'artist':
        filtered.sort((a: Play, b: Play) => a.song.artist.localeCompare(b.song.artist));
        break;
      case 'station':
        filtered.sort((a: Play, b: Play) => a.station.name.localeCompare(b.station.name));
        break;
    }

    return filtered;
  }, [plays, searchQuery, genreFilter, sortBy]);

  const totalPages = Math.ceil(totalCount / limit);

  // Calculate stats for current page
  const currentPageStats = useMemo(() => {
    const uniqueSongs = new Set(filteredAndSortedPlays.map((p: Play) => p.songId));
    const uniqueStations = new Set(filteredAndSortedPlays.map((p: Play) => p.stationId));
    const uniqueArtists = new Set(filteredAndSortedPlays.map((p: Play) => p.song.artist));

    return {
      totalPlays: filteredAndSortedPlays.length,
      uniqueSongs: uniqueSongs.size,
      uniqueStations: uniqueStations.size,
      uniqueArtists: uniqueArtists.size,
    };
  }, [filteredAndSortedPlays]);

  const handleExportToSpotify = useCallback(async () => {
    try {
      // Fetch ALL plays with current filters (no pagination)
      const params = new URLSearchParams({ limit: '10000' });
      if (stationFilter !== 'all') params.append('station', stationFilter);
      if (dateFilter !== 'all') params.append('dateFilter', dateFilter);
      if (genreFilter !== 'all') params.append('genre', genreFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/plays/recent?${params.toString()}`);
      const allPlays = response.data.plays;

      // Get unique songs
      const uniqueSongs = new Map<number, Play>();
      allPlays.forEach((play: Play) => {
        if (!uniqueSongs.has(play.songId)) {
          uniqueSongs.set(play.songId, play);
        }
      });

      // Generate Spotify search URLs
      const urls = Array.from(uniqueSongs.values())
        .map((play: Play) => `https://open.spotify.com/search/${encodeURIComponent(`${play.song.artist} ${play.song.title}`)}`)
        .join('\n');

      setSpotifyUrls(urls);
      onOpen();

      toast({
        title: 'Spotify URLs Generated',
        description: `Generated ${uniqueSongs.size} Spotify search URLs`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not generate Spotify URLs',
        status: 'error',
        duration: 3000,
      });
    }
  }, [stationFilter, dateFilter, genreFilter, searchQuery, onOpen, toast]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(spotifyUrls);
    toast({
      title: 'Copied!',
      description: 'Spotify URLs copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  if (isLoading && plays.length === 0) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text>Loading plays...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify={isLegacyMode ? 'flex-end' : 'space-between'}>
            {!isLegacyMode && (
              <Button
                as={Link}
                href="/"
                leftIcon={<FaArrowLeft />}
                variant="ghost"
              >
                Back
              </Button>
            )}
            <Button
              leftIcon={<FaSpotify />}
              colorScheme="green"
              onClick={handleExportToSpotify}
              isDisabled={filteredAndSortedPlays.length === 0}
            >
              Export to Spotify
            </Button>
          </HStack>

          {/* Title */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <HStack>
              <FaHistory size={24} />
              <Heading size="xl">
                {isLegacyMode ? 'Legacy Plays (2013-2015)' : 'All Plays'}
              </Heading>
              {isLegacyMode && (
                <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                  v1 Archive
                </Badge>
              )}
            </HStack>
            <Text color="gray.500" mt={2}>
              {isLegacyMode
                ? 'Browsing historical data from the original RadioNetwork PHP project'
                : "Browse, filter, and export your radio network's music history"}
            </Text>
          </Box>

          {/* Database Stats */}
          {dbStats && (
            <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <HStack mb={4}>
                <FaDatabase />
                <Heading size="md">Database Summary</Heading>
              </HStack>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel fontSize="sm">Total Plays</StatLabel>
                  <StatNumber color="brand.500">{dbStats.totalPlays.toLocaleString()}</StatNumber>
                  <StatHelpText fontSize="xs">All time</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel fontSize="sm">Unique Songs</StatLabel>
                  <StatNumber color="purple.500">{dbStats.totalSongs.toLocaleString()}</StatNumber>
                  <StatHelpText fontSize="xs">In database</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel fontSize="sm">Unique Artists</StatLabel>
                  <StatNumber color="green.500">{dbStats.uniqueArtists.toLocaleString()}</StatNumber>
                  <StatHelpText fontSize="xs">All time</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel fontSize="sm">Active Stations</StatLabel>
                  <StatNumber color="orange.500">{dbStats.totalStations}</StatNumber>
                  <StatHelpText fontSize="xs">Currently tracking</StatHelpText>
                </Stat>
              </SimpleGrid>
            </Box>
          )}

          <Divider />

          {/* Current View Stats */}
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Text fontSize="sm" fontWeight="semibold" mb={3}>Current View</Text>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Plays</StatLabel>
                <StatNumber fontSize="lg" color="brand.500">{currentPageStats.totalPlays}</StatNumber>
                <StatHelpText fontSize="xs">On this page</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Unique Songs</StatLabel>
                <StatNumber fontSize="lg" color="purple.500">{currentPageStats.uniqueSongs}</StatNumber>
                <StatHelpText fontSize="xs">On this page</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Artists</StatLabel>
                <StatNumber fontSize="lg" color="green.500">{currentPageStats.uniqueArtists}</StatNumber>
                <StatHelpText fontSize="xs">On this page</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Total Results</StatLabel>
                <StatNumber fontSize="lg" color="orange.500">{totalCount.toLocaleString()}</StatNumber>
                <StatHelpText fontSize="xs">With filters</StatHelpText>
              </Stat>
            </SimpleGrid>
          </Box>

          {/* Filters */}
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FaSearch color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search by song, artist, or station..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
                <Select
                  value={contentFilter}
                  onChange={(e) => {
                    setContentFilter(e.target.value as ContentFilter);
                    setPage(0);
                  }}
                >
                  <option value="songs">Songs Only</option>
                  <option value="shows">Shows Only</option>
                  <option value="all">All Content</option>
                </Select>

                {!isLegacyMode && (
                  <Select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </Select>
                )}

                <Select
                  value={stationFilter}
                  onChange={(e) => {
                    setStationFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All Stations</option>
                  {stations.map((station) => (
                    <option key={station.slug} value={station.slug}>
                      {station.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                >
                  <option value="all">All Genres</option>
                  {allGenres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </Select>

                <Select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortMode);
                    setPage(0);
                  }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="most-played">Most Played</option>
                  <option value="song">Song Title</option>
                  <option value="artist">Artist Name</option>
                  <option value="station">Station Name</option>
                </Select>
              </SimpleGrid>

              {/* Legacy Mode Year/Month Multi-Select Filters */}
              {isLegacyMode && (
                <Box bg={useColorModeValue('gray.50', 'gray.700')} p={4} borderRadius="md">
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {/* Year Selection */}
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Years {selectedYears.length > 0 && `(${selectedYears.length} selected)`}
                      </Text>
                      <CheckboxGroup
                        value={selectedYears}
                        onChange={(values) => {
                          setSelectedYears(values as string[]);
                          setPage(0);
                        }}
                      >
                        <Wrap spacing={2}>
                          {LEGACY_YEARS.map((year) => (
                            <WrapItem key={year}>
                              <Checkbox value={year} colorScheme="orange">
                                {year}
                              </Checkbox>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </CheckboxGroup>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {selectedYears.length === 0 ? 'All years (2013-2015)' : ''}
                      </Text>
                    </Box>

                    {/* Month Selection */}
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Months {selectedMonths.length > 0 && `(${selectedMonths.length} selected)`}
                      </Text>
                      <CheckboxGroup
                        value={selectedMonths}
                        onChange={(values) => {
                          setSelectedMonths(values as string[]);
                          setPage(0);
                        }}
                      >
                        <Wrap spacing={2}>
                          {MONTHS.map((month) => (
                            <WrapItem key={month.value}>
                              <Checkbox value={month.value} colorScheme="orange">
                                {month.label}
                              </Checkbox>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </CheckboxGroup>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {selectedMonths.length === 0 ? 'All months' : ''}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>
              )}

              {(searchQuery || stationFilter !== 'all' || genreFilter !== 'all' || dateFilter !== 'all' || contentFilter !== 'songs' || selectedYears.length > 0 || selectedMonths.length > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setStationFilter('all');
                    setGenreFilter('all');
                    setDateFilter('all');
                    setSelectedYears([]);
                    setSelectedMonths([]);
                    setContentFilter('songs');
                    setPage(0);
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </VStack>
          </Box>

          {/* Plays Table */}
          <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    {sortBy === 'most-played' && <Th isNumeric>Play Count</Th>}
                    <Th>{sortBy === 'most-played' ? 'Last Played' : 'Time'}</Th>
                    <Th>Song</Th>
                    <Th>Artist</Th>
                    <Th>Station</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAndSortedPlays.map((play: Play) => (
                    <Tr
                      key={play.id}
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                    >
                      {sortBy === 'most-played' && (
                        <Td isNumeric>
                          <Badge colorScheme="purple" fontSize="md" px={2} py={1}>
                            {play.playCount || 0}
                          </Badge>
                        </Td>
                      )}
                      <Td>
                        <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {format(new Date(play.playedAt), isLegacyMode ? 'MMM d, yyyy h:mm a' : 'MMM d, h:mm a')}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <ChakraLink
                            as={Link}
                            href={`/songs/${play.songId}`}
                            fontWeight="semibold"
                            color="brand.500"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {play.song.title}
                          </ChakraLink>
                          {play.song.isNonSong && (
                            <Badge colorScheme="orange" size="sm" variant="solid">
                              {play.song.nonSongType?.toUpperCase() || 'SHOW'}
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Text>{play.song.artist}</Text>
                      </Td>
                      <Td>
                        {play.station?.slug ? (
                          <>
                            {isLegacyMode && play.rawMetadata?.legacyStation ? (
                              <Text color="gray.600">
                                {play.rawMetadata.legacyStation}
                              </Text>
                            ) : (
                              <ChakraLink
                                as={Link}
                                href={`/stations/${play.station.slug}`}
                                color="gray.600"
                                _hover={{ textDecoration: 'underline' }}
                              >
                                {play.station.name}
                              </ChakraLink>
                            )}
                            {!isLegacyMode && (
                              <HStack mt={1} spacing={1}>
                                {play.station.tags?.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag} size="sm" variant="subtle" colorScheme="blue">
                                    {tag}
                                  </Badge>
                                ))}
                              </HStack>
                            )}
                          </>
                        ) : (
                          <Text color="gray.400" fontSize="sm">Various</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            {filteredAndSortedPlays.length === 0 && (
              <Box p={8} textAlign="center">
                <Text color="gray.500">No plays found matching your filters.</Text>
              </Box>
            )}

            {filteredAndSortedPlays.length > 0 && (
              <Box p={4} borderTopWidth="1px" borderColor={borderColor}>
                <HStack justify="space-between">
                  <Button
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                    isDisabled={page === 0}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Text fontSize="sm" color="gray.500">
                    Page {page + 1} of {totalPages} ({totalCount.toLocaleString()} total results)
                  </Text>
                  <Button
                    onClick={() => setPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev))}
                    isDisabled={page >= totalPages - 1}
                    size="sm"
                  >
                    Next
                  </Button>
                </HStack>
              </Box>
            )}
          </Box>
        </VStack>
      </Container>

      {/* Spotify Export Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <FaSpotify color="green" />
              <Text>Export to Spotify</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Copy these Spotify search URLs to find and add songs to your playlist:
              </Text>
              <Textarea
                value={spotifyUrls}
                readOnly
                rows={15}
                fontFamily="mono"
                fontSize="sm"
              />
              <Text fontSize="sm" color="gray.500">
                💡 Tip: Each line is a Spotify search URL. Open them in your browser to find and add songs to your playlists!
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button colorScheme="green" leftIcon={<FaFileExport />} onClick={copyToClipboard}>
              Copy All URLs
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
