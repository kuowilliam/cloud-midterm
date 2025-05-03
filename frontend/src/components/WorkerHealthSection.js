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
  Chip,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import useSSE from '../hooks/useSSE';

function WorkerHealthSection() {
  const { data, isLoading, error } = useSSE('workerStatus', {
    workers: {}
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

  const workers = data || {};
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
      <CardContent sx={{ px: 3 }}>
        <Grid container spacing={4}>
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
                <Grid item xs={12} sm={12} md={6} lg={4} key={workerName}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      p: 2,
                      height: '220px',
                      borderLeft: '4px solid',
                      borderColor: isHealthy ? 'success.main' : 'error.main',
                      width: '350px',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1 }}>
                          {workerName}
                        </Typography>
                        
                        <Chip 
                          size="small"
                          label={isHealthy ? 'Healthy' : 'Dead'}
                          color={isHealthy ? 'success' : 'error'}
                          sx={{ height: 24 }}
                        />
                      </Box>
                      
                      {metrics.ts && (
                        <Typography variant="caption" color="text.secondary">
                          Updated: {new Date(metrics.ts * 1000).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                    
                    {isHealthy && metrics && (
                      <Box sx={{ height: 'calc(100% - 30px)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Metrics:
                        </Typography>
                        
                        <Box sx={{ display: 'flex', height: '85%', justifyContent: 'space-around' }}>
                          <Box sx={{ width: '45%', height: '100%' }}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 0.5 }}>
                              CPU
                            </Typography>
                            <Box sx={{ height: 'calc(100% - 40px)', position: 'relative' }}>
                              <DonutChart 
                                value={metrics.cpu || 0}
                                color={getColorByUsage(metrics.cpu || 0)}
                              />
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  position: 'absolute', 
                                  top: '50%', 
                                  left: '50%', 
                                  transform: 'translate(-50%, -50%)',
                                  fontWeight: 'bold',
                                  color: getColorByUsage(metrics.cpu || 0)
                                }}
                              >
                                {Math.round(metrics.cpu || 0)}%
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ width: '45%', height: '100%' }}>
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 0.5 }}>
                              Memory
                            </Typography>
                            <Box sx={{ height: 'calc(100% - 40px)', position: 'relative' }}>
                              <DonutChart 
                                value={metrics.mem || 0}
                                color={getColorByUsage(metrics.mem || 0)}
                              />
                              <Typography 
                                variant="h5" 
                                sx={{ 
                                  position: 'absolute', 
                                  top: '50%', 
                                  left: '50%', 
                                  transform: 'translate(-50%, -50%)',
                                  fontWeight: 'bold',
                                  color: getColorByUsage(metrics.mem || 0)
                                }}
                              >
                                {Math.round(metrics.mem || 0)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
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

// Donut Chart Component
function DonutChart({ value, color }) {
  const data = [
    { name: 'Usage', value: value },
    { name: 'Free', value: 100 - value }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={30}
          outerRadius={45}
          paddingAngle={2}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
        >
          <Cell key={`cell-0`} fill={color} />
          <Cell key={`cell-1`} fill="#f5f5f5" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

// Helper function to determine color based on usage
function getColorByUsage(value) {
  if (value > 80) return '#f44336'; // error color
  if (value > 50) return '#ff9800'; // warning color
  return '#4caf50'; // success color
}

export default WorkerHealthSection;
