import React from 'react';
import { Grid, Typography, Box, Divider } from '@mui/material';
import AppLayout from '../components/Layout/AppLayout';
import UploadSection from '../components/UploadSection';
import QueueSection from '../components/QueueSection';
import ProcessingSection from '../components/ProcessingSection';
import DoneSection from '../components/DoneSection';
import WorkerHealthSection from '../components/WorkerHealthSection';
import EventMonitorSection from '../components/EventMonitorSection';

function Dashboard() {
  return (
    <AppLayout>
      <Box sx={{ width: '30%', pr: 2, overflowY: 'auto', height: 'calc(100vh - 100px)' }}>
        {/* Left Column - Worker Health and Event Monitor */}
        <Typography variant="h6" gutterBottom>
          System Monitoring
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <WorkerHealthSection />
        <EventMonitorSection />
      </Box>
      
      <Box sx={{ width: '70%', pl: 2, overflowY: 'auto', height: 'calc(100vh - 100px)' }}>
        {/* Right Column - Everything else */}
        <Typography variant="h4" component="h1" gutterBottom>
          Worker Administration Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Monitor and manage your image processing workers and tasks
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Upload Section */}
        <UploadSection />
        
        <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Monitoring & Management
        </Typography>
        
        {/* Queue, Processing, and Done Sections - Vertical Layout */}
        <Grid container spacing={3} direction="column">
          <Grid item xs={12}>
            <QueueSection />
          </Grid>
          <Grid item xs={12}>
            <ProcessingSection />
          </Grid>
          <Grid item xs={12}>
            <DoneSection />
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}

export default Dashboard;
