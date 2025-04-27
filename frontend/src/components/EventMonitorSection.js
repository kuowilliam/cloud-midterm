import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getMonitorEvents } from '../services/api';

function EventMonitorSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['monitorEvents'],
    queryFn: () => getMonitorEvents(20), // Get last 20 events
    refetchInterval: 1000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <Card id="event-monitor-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Event Monitor" 
          subheader="Recent system events"
          sx={{ 
            backgroundColor: 'secondary.main', 
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card id="event-monitor-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Event Monitor" 
          subheader="Recent system events"
          sx={{ 
            backgroundColor: 'secondary.main', 
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent>
          <Typography color="error">Error loading events: {error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events || [];

  return (
    <Card id="event-monitor-section" sx={{ mb: 4 }}>
      <CardHeader 
        title={`Event Monitor (${events.length})`}
        subheader="Recent system events"
        sx={{ 
          backgroundColor: 'secondary.main', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        {events.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
            No events recorded
          </Typography>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {events.map((event, index) => (
              <React.Fragment key={`${event.ts}-${index}`}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Chip 
                          label={event.type} 
                          color={event.type === 'worker_dead' ? 'error' : 'warning'} 
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(event.ts * 1000).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {event.type === 'worker_dead' && (
                          <>
                            <Typography variant="body2" component="span">
                              Worker <strong>{event.worker}</strong> died
                            </Typography>
                            {event.requeued && event.requeued.length > 0 && (
                              <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                Requeued {event.requeued.length} items
                              </Typography>
                            )}
                          </>
                        )}
                        {event.type === 'task_timeout' && (
                          <Typography variant="body2" component="span">
                            Task <strong>{event.item}</strong> timed out and was requeued
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < events.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default EventMonitorSection;
