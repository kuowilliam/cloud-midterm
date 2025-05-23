// src/components/ProcessingSection.js

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
  Chip,
  CircularProgress,
} from '@mui/material';
import useSSE from '../hooks/useSSE';

export default function ProcessingSection() {
  const { data, isLoading, error } = useSSE('status', {
    queue: 0,
    queued_items: [],
    processing: [],
    processing_workers: {},
    done: [],
    errors: {},
    retries: {}
  });

  if (isLoading) {
    return (
      <Card id="processing-section" sx={{ mb: 4 }}>
        <CardHeader
          title="Processing"
          subheader="Images currently being processed"
          sx={{
            backgroundColor: 'warning.main',
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
      <Card id="processing-section" sx={{ mb: 4 }}>
        <CardHeader
          title="Processing"
          subheader="Images currently being processed"
          sx={{
            backgroundColor: 'warning.main',
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent>
          <Typography color="error">Error loading processing data: {error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  const processingItems = data?.processing || [];
  const processingWorkers = data?.processing_workers || {};

  return (
    <Card id="processing-section" sx={{ mb: 4 }}>
      <CardHeader
        title={`Processing (${processingItems.length})`}
        subheader="Images currently being processed"
        sx={{
          backgroundColor: 'warning.main',
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        {processingItems.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
            No images being processed
          </Typography>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {processingItems.map((path, idx) => {
              const workerName = processingWorkers[path];
              return (
                <React.Fragment key={path + idx}>
                  <ListItem sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1
                  }}>
                    <ListItemText 
                      primary={
                        <Box component="div" sx={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '400px'
                        }}>
                          {path}
                        </Box>
                      }
                    />
                    {workerName && (
                      <Chip
                        label={workerName}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          fontWeight: 600,
                          backgroundColor: 'rgba(25, 118, 210, 0.1)'
                        }}
                      />
                    )}
                  </ListItem>
                  {idx < processingItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
