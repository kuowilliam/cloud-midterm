// src/components/SearchSection.js

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Slider,
  Button,
  IconButton,
  CardMedia,
  CardActionArea,
  Alert,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FileUpload as FileUploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  searchImages,
  getImageUrl,
  getDoneImages,
} from '../services/api';

export default function SearchSection() {
  const [tab, setTab] = useState('search'); // 'search' or 'storage'

  // Search state
  const [query, setQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [topK, setTopK] = useState(5);
  const [searchResults, setSearchResults] = useState([]);

  // Image detail modal state
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Store all images metadata
  const [allImagesMetadata, setAllImagesMetadata] = useState([]);

  // Mutation for search
  const searchMutation = useMutation({
    mutationFn: ({ query, imageFile, topK }) =>
      searchImages(query, imageFile, topK),
    onSuccess: (data) => {
      console.log('✅ [SearchSection] Search successful, received data:', data);
      setSearchResults(data.results || []);
    },
    onError: (error) => {
      console.error('❌ [SearchSection] Search failed:', error);
    },
  });

  // Query for all done images - disabled by default
  const {
    data: doneData,
    isLoading: doneLoading,
    error: doneError,
    refetch: refetchDone,
  } = useQuery({
    queryKey: ['doneImages'],
    queryFn: getDoneImages,
    enabled: false,
  });

  // Fetch metadata for a specific image by searching with its filename
  const fetchImageMetadata = async (filename) => {
    try {
      // Extract the base filename without path for searching
      const baseFilename = filename.split('/').pop().split('.')[0];
      // Use the filename as search query to find the specific image
      const result = await searchImages(baseFilename, null, 1);
      if (result.results && result.results.length > 0) {
        return result.results[0];
      }
    } catch (error) {
      console.error('Error fetching image metadata:', error);
    }
    return {
      filename: filename,
      caption: 'Image from processed library',
      similarity: null
    };
  };

  // Fetch all images metadata when "All Images" tab is selected
  const fetchAllImagesMetadata = async () => {
    try {
      // Use search with a very generic query to get all images with metadata
      // Use a single common word that should be present in most image captions
      const result = await searchImages('image', null, 1000); // Large number to get all
      setAllImagesMetadata(result.results || []);
    } catch (error) {
      console.error('Error fetching all images metadata:', error);
      // If that fails, try with another common word
      try {
        const result = await searchImages('a', null, 1000);
        setAllImagesMetadata(result.results || []);
      } catch (error2) {
        console.error('Error fetching all images metadata (second attempt):', error2);
        setAllImagesMetadata([]);
      }
    }
  };

  const handleTabChange = (e, value) => {
    setTab(value);
    if (value === 'storage') {
      refetchDone();
      fetchAllImagesMetadata();
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    if (query.trim() || imageFile) {
      searchMutation.mutate({ query, imageFile, topK });
    }
  };

  const handleImageSelect = e => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const inp = document.getElementById('image-upload-input');
    if (inp) inp.value = '';
  };

  const handleImageClick = async (result) => {
    // If result doesn't have caption, try to fetch it
    if (!result.caption || result.caption === 'Image from processed library') {
      const metadata = await fetchImageMetadata(result.filename);
      setSelectedImage(metadata);
    } else {
      setSelectedImage(result);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImage(null);
  };

  const renderGrid = (items, isSearchResults = false) => {
    if (!items.length) {
      return <Alert severity="info">No images to display.</Alert>;
    }
    return (
      <Grid container spacing={2}>
        {items.map((item, idx) => {
          let path, result;
          
          if (isSearchResults) {
            path = item;
            result = searchResults[idx];
          } else {
            // For "All Images" tab, find metadata from allImagesMetadata
            path = item;
            result = allImagesMetadata.find(meta => 
              meta.filename === path || meta.filename.endsWith(path)
            );
            
            // If no metadata found, create basic info
            if (!result) {
              result = {
                filename: path,
                caption: 'Image from processed library',
                similarity: null
              };
            }
          }
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                  cursor: 'pointer',
                }}
              >
                <CardActionArea onClick={() => handleImageClick(result)}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={getImageUrl(path)}
                    alt={path}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {path.split('/').pop()}
                    </Typography>
                    {isSearchResults && result && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <>
      <Card>
      <CardHeader
          title="Image search function"
          subheader="Search or browse uploaded images"
          sx={{
            backgroundColor: 'primary.main',
            '& .MuiCardHeader-subheader': {
              color: 'white',
            },
            '& .MuiCardHeader-title': {
              color: 'white',
            }
          }}
        />

        <CardContent>
          <Tabs value={tab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
            <Tab label="search" value="search" />
            <Tab label="all images" value="storage" />
          </Tabs>

          {tab === 'search' && (
            <Box component="form" onSubmit={handleSearch} sx={{ mt: 2 }}>
              {/* Search Mode Info */}
              <Alert severity="info" sx={{ mb: 3 }}>
                You can search by <strong>text description</strong> or <strong>uploading an image</strong> (only one method can be selected at a time).
                {imageFile ? ' Currently in image search mode.' : ' Currently in text search mode.'}
              </Alert>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label={imageFile ? "Text search disabled (image uploaded)" : "Describe what you're looking for (e.g., 'cat in garden')"}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={searchMutation.isLoading || imageFile}
                    placeholder={imageFile ? "Remove image to enable text search" : "Describe what you're looking for..."}
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<FileUploadIcon />}
                    disabled={searchMutation.isLoading}
                    color={imageFile ? "success" : "primary"}
                  >
                    {imageFile ? "Replace image" : "Upload image"}
                    <input
                      id="image-upload-input"
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </Button>
                  {imageFile && (
                    <IconButton onClick={clearImage} sx={{ ml: 1 }}>
                      <ClearIcon />
                    </IconButton>
                  )}
                </Grid>
                
                {/* Image Preview */}
                {imagePreview && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      p: 2, 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: 2,
                      border: '2px solid #4caf50'
                    }}>
                      <img 
                        src={imagePreview} 
                        alt="Search preview" 
                        style={{ 
                          width: 80, 
                          height: 80, 
                          objectFit: 'cover', 
                          borderRadius: 8 
                        }} 
                      />
                      <Box>
                        <Typography variant="body1" fontWeight="bold" color="success.main">
                          Image search mode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Using uploaded image for search, text input is disabled.
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} md={8}>
                  <Typography gutterBottom>Search results: {topK}</Typography>
                  <Slider
                    value={topK}
                    onChange={(_, v) => setTopK(v)}
                    min={1}
                    max={10}
                    valueLabelDisplay="auto"
                    disabled={searchMutation.isLoading}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    startIcon={
                      searchMutation.isLoading ? <CircularProgress size={20} /> : <SearchIcon />
                    }
                    disabled={searchMutation.isLoading || (!query.trim() && !imageFile)}
                  >
                    {searchMutation.isLoading ? 'Searching...' : imageFile ? 'Image search' : 'Text search'}
                  </Button>
                </Grid>
                {searchMutation.isError && (
                  <Grid item xs={12}>
                    <Alert severity="error">
                      <strong>Search error:</strong> {searchMutation.error.message}
                      <br />
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        Please ensure you provided a text description or uploaded an image.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ mt: 4 }}>
                {renderGrid(searchResults.map(r => r.filename), true)}
                {searchMutation.isSuccess && !searchResults.length && (
                  <Alert severity="info">
                    No related results found. Please try adjusting the search keywords or uploading a different image.
                  </Alert>
                )}
              </Box>
            </Box>
          )}

          {tab === 'storage' && (
            <Box sx={{ mt: 2 }}>
              {doneLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading images...
                  </Typography>
                </Box>
              ) : doneError ? (
                <Alert severity="error">Loading error: {doneError.message}</Alert>
              ) : (
                renderGrid(doneData?.done_images || [])
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Image Detail Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'primary.main',
          color: 'white',
        }}>
          <Typography variant="h6" component="div">
            Image details
          </Typography>
          <IconButton
            onClick={handleCloseModal}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedImage && (
            <Box>
              <CardMedia
                component="img"
                image={getImageUrl(selectedImage.filename)}
                alt={selectedImage.filename}
                sx={{
                  width: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  backgroundColor: '#f5f5f5',
                }}
              />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  File information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>File name:</strong> {selectedImage.filename.split('/').pop()}
                </Typography>
                {selectedImage.similarity !== null && (
                  <Typography variant="body1" gutterBottom>
                    <strong>Similarity score:</strong> {(selectedImage.similarity * 100).toFixed(2)}%
                  </Typography>
                )}
                
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 3 }}>
                  Image description
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {selectedImage.caption || 'No description available'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
