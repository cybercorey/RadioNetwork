'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
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
  Collapse,
  InputGroup,
  InputLeftElement,
  Icon,
  Link as ChakraLink,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  FormControl,
  FormLabel,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FaSearch, FaFilter, FaArrowLeft, FaChevronDown, FaChevronUp, FaTimes, FaMusic, FaBroadcastTower, FaFlag } from 'react-icons/fa';
import Link from 'next/link';
import api from '@/services/api';
import { format } from 'date-fns';

interface SearchResult {
  id: number;
  title: string;
  artist: string;
  playCount: number;
  stationCount: number;
  lastPlayed: string | null;
}

interface FilterValues {
  genres: string[];
  playRange: { min_plays: number; max_plays: number };
  stations: { id: number; name: string; slug: string }[];
}

interface AutocompleteSuggestion {
  type: 'song' | 'artist';
  id?: number;
  title?: string;
  artist: string;
  display: string;
  songCount?: number;
}

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
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'basic' | 'advanced'>('basic');

  // Basic search results
  const [songs, setSongs] = useState<Song[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  // Advanced search results
  const [advancedResults, setAdvancedResults] = useState<SearchResult[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Advanced filters
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [playRange, setPlayRange] = useState<[number, number]>([0, 1000]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const { isOpen: filtersOpen, onToggle: toggleFilters } = useDisclosure();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const suggestionHoverBg = useColorModeValue('gray.100', 'gray.700');

  // Fetch filter values on mount
  useEffect(() => {
    const fetchFilterValues = async () => {
      try {
        const response = await api.get('/search/filters/values');
        setFilterValues(response.data);
        if (response.data.playRange) {
          setPlayRange([response.data.playRange.min_plays, response.data.playRange.max_plays]);
        }
      } catch (error) {
        console.error('Failed to fetch filter values:', error);
      }
    };
    fetchFilterValues();
  }, []);

  // Autocomplete
  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const response = await api.get(`/search/autocomplete?q=${encodeURIComponent(query)}&limit=8`);
          setSuggestions(response.data.suggestions || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Autocomplete failed:', error);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const handleBasicSearch = async () => {
    if (query.length < 2) return;

    setIsLoading(true);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&type=all`);
      setSongs(response.data.songs || []);
      setPlays(response.data.plays || []);
      setStations(response.data.stations || []);
      setAdvancedResults([]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvancedSearch = async () => {
    if (query.length < 2) return;

    setIsLoading(true);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const params = new URLSearchParams({
        q: query,
        sortBy,
        minPlays: playRange[0].toString(),
        maxPlays: playRange[1].toString(),
      });

      if (selectedGenre) params.append('genre', selectedGenre);
      if (selectedStation) params.append('stationId', selectedStation);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await api.get(`/search/advanced?${params.toString()}`);
      setAdvancedResults(response.data.results || []);
      setSongs([]);
      setPlays([]);
      setStations([]);
    } catch (error) {
      console.error('Advanced search failed:', error);
      setAdvancedResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'advanced' || filtersOpen) {
      handleAdvancedSearch();
    } else {
      handleBasicSearch();
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    if (suggestion.type === 'song') {
      setQuery(suggestion.display);
    } else {
      setQuery(suggestion.artist);
    }
    setShowSuggestions(false);
    setTimeout(() => handleSearch(), 100);
  };

  const handleMarkAsNonSong = async (songId: number, type: string) => {
    try {
      await api.patch(`/songs/${songId}/mark-non-song`, { type });
      handleSearch();
    } catch (error) {
      console.error('Failed to mark as non-song:', error);
    }
  };

  const resetFilters = () => {
    setSelectedGenre('');
    setSelectedStation('');
    if (filterValues?.playRange) {
      setPlayRange([filterValues.playRange.min_plays, filterValues.playRange.max_plays]);
    }
    setDateFrom('');
    setDateTo('');
    setSortBy('relevance');
  };

  const clearSearch = () => {
    setQuery('');
    setSongs([]);
    setPlays([]);
    setStations([]);
    setAdvancedResults([]);
    setHasSearched(false);
    setShowSuggestions(false);
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <Box>
              <HStack mb={2}>
                <Icon as={FaSearch} boxSize={8} />
                <Heading size="xl">Search</Heading>
              </HStack>
              <Text color="gray.500">Find songs, artists, stations, and more</Text>
            </Box>
            <Button as={Link} href="/" leftIcon={<FaArrowLeft />} variant="ghost">
              Back
            </Button>
          </HStack>

          {/* Search Box */}
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <HStack>
                <Box flex={1} position="relative">
                  <InputGroup size="lg">
                    <InputLeftElement>
                      <Icon as={FaSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search for songs or artists..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </InputGroup>

                  {/* Autocomplete Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <Box
                      position="absolute"
                      top="100%"
                      left={0}
                      right={0}
                      mt={2}
                      bg={cardBg}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={borderColor}
                      boxShadow="lg"
                      zIndex={10}
                      maxH="300px"
                      overflowY="auto"
                    >
                      {suggestions.map((suggestion, idx) => (
                        <Box
                          key={idx}
                          p={3}
                          cursor="pointer"
                          _hover={{ bg: suggestionHoverBg }}
                          onClick={() => handleSuggestionClick(suggestion)}
                          borderBottomWidth={idx < suggestions.length - 1 ? '1px' : '0'}
                          borderColor={borderColor}
                        >
                          <HStack justify="space-between">
                            <Text fontWeight="medium">{suggestion.display}</Text>
                            <Badge colorScheme={suggestion.type === 'song' ? 'blue' : 'purple'}>
                              {suggestion.type}
                            </Badge>
                          </HStack>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                {query && (
                  <IconButton
                    aria-label="Clear search"
                    icon={<FaTimes />}
                    onClick={clearSearch}
                    variant="ghost"
                    size="lg"
                  />
                )}
                <Button
                  colorScheme="brand"
                  size="lg"
                  onClick={handleSearch}
                  isLoading={isLoading}
                  isDisabled={query.length < 2}
                  leftIcon={<Icon as={FaSearch} />}
                >
                  Search
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={toggleFilters}
                  leftIcon={<Icon as={FaFilter} />}
                  rightIcon={<Icon as={filtersOpen ? FaChevronUp : FaChevronDown} />}
                >
                  Filters
                </Button>
              </HStack>

              {/* Advanced Filters */}
              <Collapse in={filtersOpen}>
                <Box pt={4} borderTopWidth="1px" borderColor={borderColor}>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Genre</FormLabel>
                      <Select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        placeholder="All genres"
                      >
                        {filterValues?.genres.map((genre) => (
                          <option key={genre} value={genre}>
                            {genre}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Station</FormLabel>
                      <Select
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        placeholder="All stations"
                      >
                        {filterValues?.stations.map((station) => (
                          <option key={station.id} value={station.id.toString()}>
                            {station.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Sort By</FormLabel>
                      <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="relevance">Relevance</option>
                        <option value="plays">Most Plays</option>
                        <option value="recent">Recently Played</option>
                        <option value="title">Title (A-Z)</option>
                        <option value="artist">Artist (A-Z)</option>
                        <option value="stations">Most Stations</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Date From</FormLabel>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Date To</FormLabel>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">
                        Play Count Range: {playRange[0]} - {playRange[1]}
                      </FormLabel>
                      <RangeSlider
                        value={playRange}
                        onChange={(val) => setPlayRange(val as [number, number])}
                        min={filterValues?.playRange.min_plays || 0}
                        max={filterValues?.playRange.max_plays || 1000}
                        step={1}
                      >
                        <RangeSliderTrack>
                          <RangeSliderFilledTrack />
                        </RangeSliderTrack>
                        <RangeSliderThumb index={0} />
                        <RangeSliderThumb index={1} />
                      </RangeSlider>
                    </FormControl>
                  </SimpleGrid>

                  <HStack mt={4} justify="flex-end">
                    <Button size="sm" variant="ghost" onClick={resetFilters}>
                      Reset Filters
                    </Button>
                    <Button size="sm" colorScheme="brand" onClick={handleAdvancedSearch}>
                      Apply Filters
                    </Button>
                  </HStack>
                </Box>
              </Collapse>
            </VStack>
          </Box>

          {/* Results */}
          {isLoading ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" color="brand.500" mb={4} />
              <Text>Searching...</Text>
            </Box>
          ) : hasSearched ? (
            <>
              {/* Advanced Results */}
              {advancedResults.length > 0 && (
                <Box bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} overflow="hidden">
                  <Box bg="brand.500" px={6} py={4}>
                    <Heading size="md" color="white">
                      Search Results ({advancedResults.length})
                    </Heading>
                  </Box>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Song</Th>
                          <Th>Artist</Th>
                          <Th isNumeric>Play Count</Th>
                          <Th isNumeric>Stations</Th>
                          <Th>Last Played</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {advancedResults.map((result) => (
                          <Tr
                            key={result.id}
                            _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                          >
                            <Td>
                              <Text fontWeight="semibold">{result.title}</Text>
                            </Td>
                            <Td>
                              <Text>{result.artist}</Text>
                            </Td>
                            <Td isNumeric>
                              <Badge colorScheme="purple">{result.playCount}</Badge>
                            </Td>
                            <Td isNumeric>
                              <Badge colorScheme="blue">{result.stationCount}</Badge>
                            </Td>
                            <Td>
                              {result.lastPlayed ? (
                                <Text fontSize="sm" color="gray.500">
                                  {format(new Date(result.lastPlayed), 'MMM d, yyyy h:mm a')}
                                </Text>
                              ) : (
                                <Text fontSize="sm" color="gray.400">
                                  -
                                </Text>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              )}

              {/* Basic Results */}
              {(songs.length > 0 || plays.length > 0 || stations.length > 0) && (
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
                                      <Tooltip label="Mark as Show/Program">
                                        <IconButton
                                          aria-label="Mark as show"
                                          icon={<FaFlag />}
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleMarkAsNonSong(song.id, 'show')}
                                        />
                                      </Tooltip>
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
              )}

              {/* No results */}
              {advancedResults.length === 0 && songs.length === 0 && plays.length === 0 && stations.length === 0 && (
                <Box textAlign="center" py={12} bg={cardBg} borderRadius="lg">
                  <Text color="gray.500" fontSize="lg">
                    No results found. Try different search terms or filters.
                  </Text>
                </Box>
              )}
            </>
          ) : (
            <Box textAlign="center" py={12}>
              <Text color="gray.500" fontSize="lg">
                Enter at least 2 characters to search
              </Text>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
