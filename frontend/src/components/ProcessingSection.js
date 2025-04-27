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
  Chip,
  Box,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getStatus } from '../services/api';

function ProcessingSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
  });

  if (isLoading) {
    return (
      <Card sx={{ mb: 4 }}>
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
      <Card sx={{ mb: 4 }}>
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
    <Card sx={{ mb: 4 }}>
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
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {processingItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box component="div" sx={{ 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{item}</span>
                        {processingWorkers[item] && (
                          <Chip 
                            label={processingWorkers[item]} 
                            color="primary" 
                            size="small" 
                            sx={{ ml: 2 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < processingItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default ProcessingSection;
