require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 配置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(compression());

// 配置DeepSeek API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 离线翻译缓存目录
const OFFLINE_CACHE_DIR = path.join(__dirname, 'offline-cache');
if (!fs.existsSync(OFFLINE_CACHE_DIR)) {
  fs.mkdirSync(OFFLINE_CACHE_DIR);
}

// 文化敏感性配置
const CULTURAL_CONTEXT = {
  myanmar: {
    highContext: true,
    emotionalSensitivity: ['地震', '损失', '家人', '家园'],
    respectfulTerms: ['先生', '女士', '朋友'],
    avoidPhrases: ['没问题', '随便', '不用担心']
  },
  china: {
    highContext: true,
    emotionalSensitivity: ['救援', '安全', '希望', '重建'],
    respectfulTerms: ['同志', '师傅', '家人'],
    avoidPhrases: ['没办法', '不可能', '等一下']
  }
};

// 翻译请求处理
async function translateText(text, sourceLang, targetLang) {
  try {
    // 检查离线缓存
    const cacheKey = `${sourceLang}-${targetLang}-${text}`;
    const cacheFile = path.join(OFFLINE_CACHE_DIR, `${cacheKey}.json`);
    
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return {
        translatedText: cached.translatedText,
        culturalNotes: cached.culturalNotes,
        fromCache: true
      };
    }

    // 调用DeepSeek API进行翻译
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一位精通中缅双语的翻译专家，同时也是跨文化沟通和心理支持专家。在翻译时，请特别注意：
          1. 准确传达原意的同时，考虑高低语境文化差异
          2. 避免使用可能引起灾民情绪波动的词汇
          3. 保持语气温暖、尊重、充满希望
          4. 对于敏感词汇进行适当调整
          5. 提供必要的文化注释，帮助救援人员理解背后的文化含义
          请以JSON格式返回，包含translatedText和culturalNotes字段。`
        },
        {
          role: 'user',
          content: `请将以下${sourceLang}文本翻译成${targetLang}，并考虑地震灾害救援场景的文化敏感性：\n${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = JSON.parse(response.data.choices[0].message.content);
    
    // 缓存结果
    fs.writeFileSync(cacheFile, JSON.stringify(result), 'utf8');
    
    return {
      translatedText: result.translatedText,
      culturalNotes: result.culturalNotes,
      fromCache: false
    };
  } catch (error) {
    console.error('Translation error:', error.message);
    // 离线模式下返回基本翻译
    return {
      translatedText: `[离线模式] ${text}`,
      culturalNotes: '当前网络连接中断，使用离线模式',
      fromCache: false,
      offline: true
    };
  }
}

// 翻译API端点
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    
    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await translateText(text, sourceLang, targetLang);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Translation service error', message: error.message });
  }
});

// 文化敏感性检查API
app.post('/api/cultural-check', (req, res) => {
  try {
    const { text, culture } = req.body;
    
    if (!text || !culture || !CULTURAL_CONTEXT[culture]) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const context = CULTURAL_CONTEXT[culture];
    const issues = [];
    
    // 检查敏感词汇
    context.emotionalSensitivity.forEach(sensitive => {
      if (text.includes(sensitive)) {
        issues.push({ type: 'sensitive', term: sensitive, message: `注意：该词汇在${culture}文化中可能引起强烈情绪反应` });
      }
    });
    
    // 检查避免使用的短语
    context.avoidPhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        issues.push({ type: 'avoid', term: phrase, message: `建议：在${culture}文化中避免使用该短语` });
      }
    });

    res.json({ issues, highContext: context.highContext, respectfulTerms: context.respectfulTerms });
  } catch (error) {
    res.status(500).json({ error: 'Cultural check error', message: error.message });
  }
});

// 离线模式支持 - 获取缓存列表
app.get('/api/offline-cache', (req, res) => {
  try {
    const files = fs.readdirSync(OFFLINE_CACHE_DIR);
    const cacheList = files.map(file => {
      const content = JSON.parse(fs.readFileSync(path.join(OFFLINE_CACHE_DIR, file), 'utf8'));
      return {
        id: file.replace('.json', ''),
        ...content
      };
    });
    res.json(cacheList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache', message: error.message });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（用于前端部署）
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at: http://localhost:${PORT}/api`);
});
