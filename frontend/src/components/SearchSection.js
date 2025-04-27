import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Slider,
  Paper,
  CardMedia,
  CardActionArea,
  Tooltip,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { searchImages, getImageUrl } from '../services/api';

function SearchSection() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const searchMutation = useMutation({
    mutationFn: ({ query, topK }) => searchImages(query, topK),
    onSuccess: (data) => {
      setSearchResults(data.results || []);
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchMutation.mutate({ query, topK });
    }
  };

  const handleImageClick = (result) => {
    setSelectedImage(result);
  };

  const handleCloseDetail = () => {
    setSelectedImage(null);
  };

  return (
    <Card>
      <CardHeader 
        title="Search Images" 
        subheader="Search for images using natural language"
        sx={{ 
          backgroundColor: 'primary.main', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Query"
                variant="outlined"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a description to search for similar images"
                disabled={searchMutation.isPending}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom>Results Count: {topK}</Typography>
                <Slider
                  value={topK}
                  onChange={(e, newValue) => setTopK(newValue)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={searchMutation.isPending}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={searchMutation.isPending ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending}
                type="submit"
                sx={{ height: '56px' }}
              >
                {searchMutation.isPending ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {searchMutation.isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error searching images: {searchMutation.error.message}
          </Alert>
        )}

        {searchResults.length > 0 ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length})
            </Typography>
            <Grid container spacing={3}>
              {searchResults.map((result, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card 
                    elevation={3}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)',
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleImageClick(result)}>
                      <CardMedia
                        component="img"
                        height="160"
                        image={getImageUrl(result.filename)}
                        alt={result.caption}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mb: 1,
                            height: '40px',
                          }}
                        >
                          {result.caption}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Similarity:
                          </Typography>
                          <Tooltip title={`${(result.similarity * 100).toFixed(1)}% match`}>
                            <Box
                              sx={{
                                width: '60%',
                                height: 8,
                                bgcolor: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: 5,
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${result.similarity * 100}%`,
                                  bgcolor: result.similarity > 0.7 ? 'success.main' : 
                                           result.similarity > 0.4 ? 'warning.main' : 'error.main',
                                  borderRadius: 'inherit',
                                }}
                              />
                            </Box>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : searchMutation.isSuccess && (
          <Alert severity="info">No results found. Try a different search query.</Alert>
        )}

        {/* Image Detail Modal */}
        {selectedImage && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
            }}
            onClick={handleCloseDetail}
          >
            <Paper
              elevation={24}
              sx={{
                maxWidth: '90%',
                maxHeight: '90%',
                width: 'auto',
                height: 'auto',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ position: 'relative' }}>
                <img
                  src={getImageUrl(selectedImage.filename)}
                  alt={selectedImage.caption}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(90vh - 100px)',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="body1" gutterBottom>
                    {selectedImage.caption}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Similarity: {(selectedImage.similarity * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Path: {selectedImage.filename}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchSection;
