import React from 'react';
import { Typography, Box, Divider, Container, Paper } from '@mui/material';
import AppLayout from '../components/Layout/AppLayout';
import SearchSection from '../components/SearchSection';

function Search() {
  return (
    <AppLayout>
      <Container maxWidth={false} sx={{ height: 'calc(100vh - 100px)' }}>
        <Paper
          elevation={2}
          sx={{
            height: '100%',
            p: 4,
            borderRadius: 2,
            overflowY: 'auto',
          }}
        >
          {/* 頁面標題 */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: '2.2rem',
                color: 'text.primary',
              }}
            >
              AI 智能圖像搜索
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: '1.1rem',
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              透過自然語言描述或上傳圖片來搜尋相似圖像
            </Typography>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'divider' }} />

          {/* 搜尋區域 */}
          <Box>
            <SearchSection />
          </Box>
        </Paper>
      </Container>
    </AppLayout>
  );
}

export default Search;
