import React from 'react';
import { Grid, Typography, Container, Divider } from '@mui/material';
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
      <Container maxWidth="xl">
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
        
        {/* Queue, Processing, and Done Sections */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <QueueSection />
          </Grid>
          <Grid item xs={12} md={4}>
            <ProcessingSection />
          </Grid>
          <Grid item xs={12} md={4}>
            <DoneSection />
          </Grid>
        </Grid>
        
        {/* Worker Health Section */}
        <WorkerHealthSection />
        
        {/* Event Monitor Section */}
        <EventMonitorSection />
      </Container>
    </AppLayout>
  );
}

export default Dashboard;
