import React from 'react';
import { Typography, Container, Divider } from '@mui/material';
import AppLayout from '../components/Layout/AppLayout';
import SearchSection from '../components/SearchSection';

function Search() {
  return (
    <AppLayout>
      <Container maxWidth="xl">
        <Typography variant="h4" component="h1" gutterBottom>
          Image Search
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Search for images using natural language queries
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Search Section */}
        <SearchSection />
      </Container>
    </AppLayout>
  );
}

export default Search;
