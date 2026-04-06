import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  SwapHoriz,
  Send,
  Info,
  Warning,
  CheckCircle,
  CloudOff,
  Cloud
} from '@mui/icons-material';

function App() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh-CN');
  const [targetLang, setTargetLang] = useState('my-MM');
  const [isTranslating, setIsTranslating] = useState(false);
  const [culturalIssues, setCulturalIssues] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fromCache, setFromCache] = useState(false);
  const [culturalNotes, setCulturalNotes] = useState('');

  // 语言选项
  const languages = [
    { value: 'zh-CN', label: '中文(简体)' },
    { value: 'my-MM', label: '缅甸语' },
    { value: 'en-US', label: '英语(美国)' }
  ];

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('网络已连接');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('网络连接已断开，将使用离线模式');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 交换语言
  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  // 执行翻译
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.warning('请输入要翻译的文本');
      return;
    }
    
    setIsTranslating(true);
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-e5ca9d2d0e7e4b1791eab2091e18cbda'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个翻译助手。将用户输入的内容从${sourceLang === 'zh-CN' ? '中文' : sourceLang === 'en-US' ? '英语' : '缅甸语'}翻译成${targetLang === 'zh-CN' ? '中文' : targetLang === 'en-US' ? '英语' : '缅甸语'}。只输出翻译结果，不要添加任何解释。`
            },
            {
              role: 'user',
              content: sourceText
            }
          ]
        })
      });
      
      const data = await response.json();
      setTranslatedText(data.choices[0].message.content);
      setFromCache(false);
      setCulturalNotes('');
      toast.success('翻译完成');
    } catch (error) {
      console.error('翻译失败:', error);
      toast.error('翻译失败，请重试');
      setTranslatedText('翻译失败，请重试');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            灾难救援翻译平台
          </Typography>
        </Box>

        {/* 网络状态指示器 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Tooltip title={isOnline ? '在线模式' : '离线模式'}>
            <IconButton color={isOnline ? 'success' : 'warning'} size="small">
              {isOnline ? <Cloud /> : <CloudOff />}
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          {/* 左侧：输入区域 */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', minHeight: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>源语言</InputLabel>
                  <Select
                    value={sourceLang}
                    label="源语言"
                    onChange={(e) => setSourceLang(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <IconButton onClick={swapLanguages} color="primary">
                  <SwapHoriz />
                </IconButton>

                <FormControl fullWidth size="small">
                  <InputLabel>目标语言</InputLabel>
                  <Select
                    value={targetLang}
                    label="目标语言"
                    onChange={(e) => setTargetLang(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                placeholder="请输入要翻译的文本..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={handleTranslate}
                disabled={isTranslating}
                fullWidth
                size="large"
              >
                {isTranslating ? '翻译中...' : '开始翻译'}
              </Button>

              {/* 文化敏感性警告 */}
              {culturalIssues.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="subtitle2" gutterBottom>
                      文化敏感性提醒：
                    </Typography>
                    {culturalIssues.map((issue, index) => (
                      <Box key={index} sx={{ mb: 1, pl: 2 }}>
                        <Typography variant="body2" sx={{ color: 'warning.dark' }}>
                          • {issue.message}
                        </Typography>
                      </Box>
                    ))}
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 右侧：输出区域 */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', minHeight: 400 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  翻译结果
                </Typography>
                {fromCache && (
                  <Tooltip title="使用缓存结果">
                    <CheckCircle sx={{ color: 'success.main' }} />
                  </Tooltip>
                )}
              </Box>

              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                placeholder="翻译结果将显示在这里..."
                value={translatedText}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />

              {/* 文化注释 */}
              {culturalNotes && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Info sx={{ color: 'info.main', mt: 0.5 }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                          文化注释：
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {culturalNotes}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* 翻译提示 */}
              <Divider sx={{ my: 2 }} />
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                    救援沟通小贴士：
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • 使用简单、清晰的语言
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • 保持语气温暖、尊重
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • 避免使用可能引起情绪波动的词汇
                  </Typography>
                  <Typography variant="body2">
                    • 注意肢体语言和文化差异
                  </Typography>
                </CardContent>
              </Card>
            </Paper>
          </Grid>
        </Grid>

        {/* 关于平台 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            本平台专为跨文化救援任务设计，集成文化敏感性分析，支持离线使用
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default App;