// src/pages/Dashboard.js

import React from 'react';
import { Grid, Typography, Box, Divider, Paper, Container } from '@mui/material';
import AppLayout from '../components/Layout/AppLayout';
import UploadSection from '../components/UploadSection';
import QueueSection from '../components/QueueSection';
import ProcessingSection from '../components/ProcessingSection';
import DoneSection from '../components/DoneSection';
import WorkerHealthSection from '../components/WorkerHealthSection';
import EventMonitorSection from '../components/EventMonitorSection';

export default function Dashboard() {
  return (
    <AppLayout>
      <Container maxWidth={false} sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: 'calc(100vh - 100px)' }}>
        
        <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
          {/* Left Monitoring Panel */}
          <Paper 
            elevation={2} 
            sx={{ 
              width: '35%', 
              p: 3, 
              overflowY: 'auto', 
              height: '100%',
              borderRadius: 2
            }}
          >
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                color: 'primary.main',
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                pb: 1,
                mb: 3
              }}
            >
          System Monitoring
        </Typography>
            
            <Box sx={{ mb: 4 }}>
        <WorkerHealthSection />
            </Box>
            
            <Box>
        <EventMonitorSection />
      </Box>
          </Paper>

          {/* Right Main Operation Area */}
          <Paper 
            elevation={2} 
            sx={{ 
              width: '65%', 
              p: 3, 
              overflowY: 'auto', 
              height: '100%',
              borderRadius: 2
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
                  color: 'text.primary'
                }}
              >
                Image Processing Management Center
        </Typography>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ 
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  lineHeight: 1.6
                }}
              >
                Monitor and manage your image processing workflow
        </Typography>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'divider' }} />

            {/* Upload Area */}
            <Box sx={{ mb: 4 }}>
        <UploadSection />
            </Box>

            {/* Monitoring Management Area */}
            <Box>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  mt: 4, 
                  mb: 3,
                  fontWeight: 600,
                  fontSize: '1.5rem',
                  color: 'text.primary'
                }}
              >
                Task Monitoring & Management
        </Typography>

        <Grid container spacing={3} direction="column">
          <Grid item>
                  <QueueSection />
          </Grid>
          <Grid item>
                  <ProcessingSection />
          </Grid>
          <Grid item>
                  <DoneSection />
          </Grid>
        </Grid>
      </Box>
          </Paper>
        </Box>
      </Container>
    </AppLayout>
  );
}
