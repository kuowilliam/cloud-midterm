import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Container,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import apiService, { getImageUrl } from '../services/api';
import AppLayout from '../components/Layout/AppLayout';

function PdfSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search question');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await apiService.searchPdf(query);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed, please try again later. Please upload PDF documents in the dashboard first.');
      console.error("Search PDF error:", err);
    }
    setIsLoading(false);
  };

  return (
    <AppLayout>
      <Container maxWidth={false} sx={{ height: 'calc(100vh - 100px)' }}>
        <Paper
          elevation={2}
          sx={{
            height: '100%',
            p: 4,
            borderRadius: 2,
            overflowY: 'auto',
          }}
        >
          {/* Page Title */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: '2.2rem',
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <PdfIcon fontSize="large" color="primary" />
              PDF Document Search
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: '1.1rem',
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Ask questions about uploaded PDF documents and get intelligent answers with relevant pages. Please upload PDF documents in the dashboard first.
            </Typography>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'divider' }} />

          {/* Information Alert */}
          <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
            <Typography variant="body1">
              <strong>Instructions:</strong> Please upload PDF documents in the "Dashboard" page first. After processing is complete, you can search PDF content on this page.
            </Typography>
          </Alert>

          {/* Search Area */}
          <Paper
            elevation={1}
            sx={{
              p: 4,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                mb: 3,
              }}
            >
              Search PDF Content
            </Typography>

            <Box component="form" onSubmit={handleSearch}>
              <TextField
                fullWidth
                label="Please enter your question about the PDF content"
                variant="outlined"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                placeholder="e.g., What is the main content of this document?"
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                {isLoading ? 'Searching...' : 'Search PDF Content'}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {isLoading && !results && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress size={40} />
              </Box>
            )}

            {results && (
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: 'primary.main',
                    mb: 3,
                  }}
                >
                  Search Results
                </Typography>

                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  {results.top_result?.filename && (
                    <CardMedia
                      component="img"
                      alt={`Page from ${results.top_result.filename}`}
                      height="600"
                      image={getImageUrl(results.top_result.filename)}
                      sx={{
                        objectFit: 'contain',
                        borderBottom: '1px solid #eee',
                        p: 2,
                        backgroundColor: '#fafafa',
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        mb: 2,
                      }}
                    >
                      AI Intelligent Answer:
                    </Typography>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        whiteSpace: 'pre-wrap',
                        backgroundColor: '#f8f9fa',
                        mb: 3,
                        borderRadius: 2,
                        border: '1px solid #e3f2fd',
                      }}
                    >
                      <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                        {results.gemini_answer || 'Unable to provide relevant answer'}
                      </Typography>
                    </Paper>

                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                        <strong>Source Document Page:</strong>{' '}
                        <span style={{ color: '#1976d2' }}>
                          {results.top_result?.filename}
                        </span>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Similarity Score: {results.top_result?.similarity?.toFixed(3)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Paper>
      </Container>
    </AppLayout>
  );
}

export default PdfSearchPage; 