import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { uploadZip } from '../services/api';

function UploadSection() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a ZIP file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadZip(file);
      setUploadResult(result);
      setFile(null);
      // Reset the file input
      const fileInput = document.getElementById('zip-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card id="upload-section" sx={{ mb: 4 }}>
      <CardHeader 
        title="Upload ZIP File" 
        subheader="Upload a ZIP file containing images to process"
        sx={{ 
          backgroundColor: 'primary.main', 
          color: 'white',
          '& .MuiCardHeader-subheader': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        }}
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
          <input
            accept=".zip"
            id="zip-file-input"
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="zip-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              sx={{ mb: 2 }}
              disabled={uploading}
            >
              Select ZIP File
            </Button>
          </label>
          
          {file && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selected file: {file.name}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            sx={{ mt: 2 }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload and Process'}
          </Button>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          {uploadResult && (
            <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
              {uploadResult.message}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default UploadSection;
