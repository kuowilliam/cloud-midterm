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
  Tooltip,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getStatus, getImageUrl } from '../services/api';

function DoneSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status'],
    queryFn: getStatus,
  });

  const handleImageClick = (item) => {
    window.open(getImageUrl(item), '_blank');
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Done" 
          subheader="Processed images"
          sx={{ 
            backgroundColor: 'success.main', 
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
          title="Done" 
          subheader="Processed images"
          sx={{ 
            backgroundColor: 'success.main', 
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent>
          <Typography color="error">Error loading done data: {error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  const doneItems = data?.done || [];
  const errors = data?.errors || {};
  const retries = data?.retries || {};

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader 
        title={`Done (${doneItems.length})`}
        subheader="Processed images"
        sx={{ 
          backgroundColor: 'success.main', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        {doneItems.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
            No processed images yet
          </Typography>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {doneItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                <ListItem 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                  onClick={() => handleImageClick(item)}
                >
                  <ListItemText
                    primary={
                      <Tooltip title="Click to view image">
                        <Box component="div" sx={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span>{item}</span>
                          {retries[item] && (
                            <Tooltip title="This image was retried">
                              <Chip 
                                label="Retried" 
                                color="warning" 
                                size="small" 
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                          {errors[item] && (
                            <Tooltip title={errors[item]}>
                              <Chip 
                                label="Error" 
                                color="error" 
                                size="small" 
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Tooltip>
                    }
                  />
                </ListItem>
                {index < doneItems.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default DoneSection;
