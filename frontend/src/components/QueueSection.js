import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteQueueItem } from '../services/api';
import useSSE from '../hooks/useSSE';

function QueueSection() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useSSE('status', {
    queue: 0,
    queued_items: [],
    processing: [],
    processing_workers: {},
    done: [],
    errors: {},
    retries: {}
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to remove "${item}" from the queue?`)) {
      deleteMutation.mutate(item);
    }
  };

  if (isLoading) {
  return (
    <Card id="queue-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Queue" 
          subheader="Images waiting to be processed"
          sx={{ 
            backgroundColor: 'info.main', 
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
      <Card id="queue-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Queue" 
          subheader="Images waiting to be processed"
          sx={{ 
            backgroundColor: 'info.main', 
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent>
          <Typography color="error">Error loading queue data: {error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  const queuedItems = data?.queued_items || [];
  const queueCount = queuedItems.length || 0;

  return (
    <Card id="queue-section" sx={{ mb: 4, width: '1000px' }}>
      <CardHeader 
        title={`Queue (${queueCount})`}
        subheader="Images waiting to be processed"
        sx={{ 
          backgroundColor: 'info.main', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        {queuedItems.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
            No images in queue
          </Typography>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {queuedItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                <ListItem
                  secondaryAction={
                    <Tooltip title="Remove from queue">
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Box component="div" sx={{ 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item}
                      </Box>
                    }
                  />
                </ListItem>
                {index < queuedItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default QueueSection;
