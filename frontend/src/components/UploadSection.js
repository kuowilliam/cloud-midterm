// src/components/UploadSection.js

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
  Grid,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

export default function UploadSection() {
  const [zipFile, setZipFile] = useState(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipError, setZipError] = useState('');
  const [zipResult, setZipResult] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfResult, setPdfResult] = useState(null);

  const handleZipFileChange = (e) => {
    const f = e.target.files[0];
    if (f?.name.toLowerCase().endsWith('.zip')) {
      setZipFile(f);
      setZipError('');
    } else {
      setZipFile(null);
      setZipError('Please select a .zip file');
    }
  };

  const handleZipUpload = async () => {
    if (!zipFile) {
      setZipError('Please select a ZIP file first');
      return;
    }
    
    console.log('🚀 [ZIP Upload] Starting upload process');
    console.log('📁 [ZIP Upload] File details:', {
      name: zipFile.name,
      size: zipFile.size,
      type: zipFile.type,
      lastModified: new Date(zipFile.lastModified).toISOString()
    });
    
    setZipUploading(true);
    setZipError('');
    
    try {
      console.log('📤 [ZIP Upload] Calling uploadZip API...');
      const result = await apiService.uploadZip(zipFile);
      
      console.log('✅ [ZIP Upload] Upload successful!');
      console.log('📊 [ZIP Upload] Server response:', result);
      
      setZipResult(result);
      setZipFile(null);
      // Clear file input
      const fileInput = document.getElementById('zip-file-input');
      if (fileInput) fileInput.value = '';
      
      console.log('🎯 [ZIP Upload] Process completed successfully');
      
    } catch (err) {
      console.error('❌ [ZIP Upload] Upload failed!');
      console.error('🔍 [ZIP Upload] Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        config: err.config
      });
      
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      console.error('💥 [ZIP Upload] Final error message:', errorMessage);
      
      setZipError(errorMessage);
    } finally {
      setZipUploading(false);
      console.log('🏁 [ZIP Upload] Upload process finished');
    }
  };

  const handlePdfFileChange = (e) => {
    const f = e.target.files[0];
    if (
      f &&
      (f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.zip'))
    ) {
      setPdfFile(f);
      setPdfError('');
    } else {
      setPdfFile(null);
      setPdfError('Please select a .pdf or .zip file');
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      setPdfError('Please select a PDF or ZIP file first');
      return;
    }
    
    console.log('🚀 [PDF Upload] Starting upload process');
    console.log('📄 [PDF Upload] File details:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type,
      lastModified: new Date(pdfFile.lastModified).toISOString()
    });
    
    setPdfUploading(true);
    setPdfError('');
    
    try {
      console.log('📤 [PDF Upload] Calling uploadPdfOrZip API...');
      const result = await apiService.uploadPdfOrZip(pdfFile);
      
      console.log('✅ [PDF Upload] Upload successful!');
      console.log('📊 [PDF Upload] Server response:', result);
      
      setPdfResult(result);
      setPdfFile(null);
      // Clear file input
      const fileInput = document.getElementById('pdf-file-input');
      if (fileInput) fileInput.value = '';
      
      console.log('🎯 [PDF Upload] Process completed successfully');
      
    } catch (err) {
      console.error('❌ [PDF Upload] Upload failed!');
      console.error('🔍 [PDF Upload] Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        config: err.config
      });
      
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      console.error('💥 [PDF Upload] Final error message:', errorMessage);
      
      setPdfError(errorMessage);
    } finally {
      setPdfUploading(false);
      console.log('🏁 [PDF Upload] Upload process finished');
    }
  };

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Image ZIP Upload */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title="Upload Image ZIP File"
            subheader="Upload Image ZIP File"
            sx={{
              backgroundColor: 'info.main',
              color: 'white',
              '& .MuiCardHeader-subheader': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          />
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
              <input
                accept=".zip"
                id="zip-file-input"
                type="file"
                onChange={handleZipFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="zip-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={zipUploading}
                  sx={{
                    py: 1.2,
                    px: 3,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  Select ZIP File
                </Button>
              </label>
              
              {zipFile && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  Selected: {zipFile.name}
                </Typography>
              )}
              
              <Button
                variant="contained"
                onClick={handleZipUpload}
                disabled={!zipFile || zipUploading}
                sx={{
                  py: 1.2,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
                startIcon={zipUploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
              >
                {zipUploading ? 'Uploading...' : 'Upload ZIP'}
              </Button>
            </Box>

              {zipError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {zipError}
                </Alert>
              )}
            
              {zipResult && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  {zipResult.message}
                </Alert>
              )}
          </CardContent>
        </Card>
      </Grid>

      {/* PDF Upload */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            title="Upload PDF Documents"
            subheader="Upload PDF or ZIP File"
            sx={{
              backgroundColor: 'info.main',
              color: 'white',
              '& .MuiCardHeader-subheader': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          />
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
              <input
                accept=".pdf,.zip"
                id="pdf-file-input"
                type="file"
                onChange={handlePdfFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="pdf-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PictureAsPdfIcon />}
                  disabled={pdfUploading}
                  sx={{
                    py: 1.2,
                    px: 3,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  Select PDF/ZIP File
                </Button>
              </label>
              
              {pdfFile && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  Selected: {pdfFile.name}
                </Typography>
              )}
              
              <Button
                variant="contained"
                onClick={handlePdfUpload}
                disabled={!pdfFile || pdfUploading}
                sx={{
                  py: 1.2,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
                startIcon={pdfUploading ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
              >
                {pdfUploading ? 'Uploading...' : 'Upload PDF'}
              </Button>
            </Box>

              {pdfError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {pdfError}
                </Alert>
              )}
            
              {pdfResult && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  {pdfResult.message}
                </Alert>
              )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
