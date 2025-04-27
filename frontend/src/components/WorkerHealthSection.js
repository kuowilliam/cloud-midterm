import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  CircularProgress,
  Box,
  Paper,
  Tooltip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getWorkerStatus } from '../services/api';

function WorkerHealthSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workerStatus'],
    queryFn: getWorkerStatus,
    refetchInterval: 1000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <Card id="worker-health-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Worker Health" 
          subheader="Status and metrics of worker nodes"
          sx={{ 
            backgroundColor: 'primary.dark', 
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
      <Card id="worker-health-section" sx={{ mb: 4 }}>
        <CardHeader 
          title="Worker Health" 
          subheader="Status and metrics of worker nodes"
          sx={{ 
            backgroundColor: 'primary.dark', 
            color: 'white',
            '& .MuiCardHeader-subheader': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
          }}
        />
        <CardContent>
          <Typography color="error">Error loading worker status: {error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  const workers = data?.workers || {};
  const workerNames = Object.keys(workers);

  return (
    <Card id="worker-health-section" sx={{ mb: 4 }}>
      <CardHeader 
        title="Worker Health" 
        subheader="Status and metrics of worker nodes"
        sx={{ 
          backgroundColor: 'primary.dark', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        <Grid container spacing={3}>
          {workerNames.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
                No worker information available
              </Typography>
            </Grid>
          ) : (
            workerNames.map((workerName) => {
              const worker = workers[workerName];
              const isHealthy = worker.status === 'health';
              const metrics = worker.metrics || {};
              
              return (
                <Grid item xs={12} sm={6} md={4} key={workerName}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      p: 2, 
                      borderTop: '4px solid',
                      borderColor: isHealthy ? 'success.main' : 'error.main',
                      height: '100%',
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      {workerName}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: isHealthy ? 'success.main' : 'error.main',
                          mr: 1,
                        }}
                      />
                      <Typography variant="body1">
                        {isHealthy ? 'Healthy' : 'Dead'}
                      </Typography>
                    </Box>
                    
                    {isHealthy && metrics && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Metrics:
                        </Typography>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Tooltip title="CPU Usage">
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  CPU
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgressWithLabel 
                                      value={metrics.cpu || 0} 
                                      color={metrics.cpu > 80 ? 'error' : metrics.cpu > 50 ? 'warning' : 'success'}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Tooltip>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Tooltip title="Memory Usage">
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Memory
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgressWithLabel 
                                      value={metrics.mem || 0} 
                                      color={metrics.mem > 80 ? 'error' : metrics.mem > 50 ? 'warning' : 'success'}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Tooltip>
                          </Grid>
                        </Grid>
                        
                        {metrics.ts && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Last updated: {new Date(metrics.ts * 1000).toLocaleTimeString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              );
            })
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

// Custom LinearProgress with label
function LinearProgressWithLabel({ value, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress
          variant="determinate"
          value={value}
          color={color}
          sx={{ height: 8, borderRadius: 5 }}
        />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  );
}

// Custom LinearProgress component
function LinearProgress({ value, color, ...props }) {
  return (
    <Box
      sx={{
        height: props.sx?.height || 4,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: props.sx?.borderRadius || 2,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: 
            color === 'error' ? 'error.main' : 
            color === 'warning' ? 'warning.main' : 
            'success.main',
          borderRadius: 'inherit',
          transition: 'width 0.4s ease-in-out',
        }}
      />
    </Box>
  );
}

export default WorkerHealthSection;
