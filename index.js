require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: [
    'https://shoppe-ai-9px3.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    /\.vercel\.app$/,
    /\.netlify\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Middleware adicional para headers CORS em todas as respostas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Responde imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

function calcularCPA(markdown) {
  const investimentoMatch = markdown.match(/(?:Investimento em Ads|Investimento total em Ads)\s*[:|]\s*R\$\s*([\d.,]+)/i);
  const pedidosMatch = markdown.match(/(?:Pedidos Pagos(?:\s*Mês)?|Pedidos via Ads)\s*[:|]\s*(\d+)/i);

  if (investimentoMatch && pedidosMatch) {
    const investimento = parseFloat(investimentoMatch[1].replace(/\./g, '').replace(',', '.'));
    const pedidos = parseInt(pedidosMatch[1]);

    if (pedidos > 0) {
      const cpa = (investimento / pedidos).toFixed(2);
      return markdown.replace(
        /(CPA\s*(?:Médio|via Ads|geral)?\s*[:|])\s*(?:Dado não informado|R\$\s*[\d.,]+)/gi,
        `$1 R$${cpa.replace('.', ',')}`
      );
    }
  }
  return markdown;
}

async function gerarAnaliseComIA(basePrompt, imageMessages, analysisType, ocrTexts, maxRetries = 1) {
  console.log('===== INICIANDO GERAÇÃO DE ANÁLISE =====');
  console.log('Prompt base (primeiros 300 chars):', basePrompt.slice(0, 300));
  console.log('OCR Texts:', JSON.stringify(ocrTexts, null, 2));
  console.log('Quantidade de imagens:', imageMessages.length);
  if (imageMessages.length > 0) {
    console.log('Exemplo de imageMessage:', JSON.stringify(imageMessages[0], null, 2));
  }

  const messages = [
    { role: "system", content: basePrompt },
    ...ocrTexts.map((text) => ({ role: "user", content: text })),
    ...imageMessages.map((img) => ({
      role: "user",
      content: [img],
    })),
  ];

  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      const requestBody = {
        model: "gpt-4.1",
        messages,
        max_tokens: 6000,
        temperature: 0,
        top_p: 1,
      };
      console.log(`Enviando request para OpenAI (tentativa ${tentativa})...`);
      console.log('RequestBody:', JSON.stringify(requestBody, null, 2).slice(0, 1000));

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro da OpenAI:', errorData);
        throw new Error(errorData.error?.message || "Erro desconhecido");
      }

      const data = await response.json();
      console.log('Resposta bruta da OpenAI:', JSON.stringify(data, null, 2));
      let markdownGerado = data.choices?.[0]?.message?.content || "";

      if (
        !markdownGerado.trim() ||
        /i (can't|cannot|sorry|unable|not allowed|not able)/i.test(
          markdownGerado
        )
      ) {
        markdownGerado = "";
      }

      return markdownGerado;
    } catch (error) {
      console.error('Erro ao gerar análise (tentativa', tentativa, "):", error);
      if (tentativa === maxRetries) {
        return "Erro ao gerar análise: " + error.message;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * tentativa));
    }
  }
  return "Erro ao gerar análise";
}


app.post('/analise', async (req, res) => {
  try {
    const { images, analysisType, clientName, ocrTexts = [] } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }
    if (!analysisType || !["ads", "account", "express"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    const basePrompt =
      analysisType === "ads"
        ? `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
        : analysisType === "account"
          ? `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
          : `${EXPRESS_ACCOUNT_ANALYSIS}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

    const imageMessages = images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${img}` },
    }));

    let markdownFinal = await gerarAnaliseComIA(
      basePrompt,
      imageMessages,
      analysisType,
      ocrTexts
    );

    res.json({
      analysis: markdownFinal,
      analysisType,
      clientName: clientName || "Cliente",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Erro interno do servidor",
      details: "Falha na geração da análise",
    });
  }
});

function protegerTopicosImportantes(markdown) {
  const titulosImportantes = [
    "RESUMO TÉCNICO",
    "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA",
    "CONCLUSÃO FINAL – PLANO RECOMENDADO"
  ];

  titulosImportantes.forEach(titulo => {
    const regex = new RegExp(`(##+\\s*${titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n##|$)`, 'gi');
    markdown = markdown.replace(regex, match => {
      let corrigido = match;
      if (!match.trim().startsWith('##')) {
        corrigido = '## ' + match.trim();
      }
      return `<div class="avoid-break">\n${corrigido}\n</div>`;
    });
  });

  return markdown;
}

function protegerBlocosFixos(markdown) {
  const titulosFixos = [
    "RESUMO TÉCNICO",
    "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA",
    "CONCLUSÃO FINAL – PLANO RECOMENDADO"
  ];

  for (const titulo of titulosFixos) {
    const regex = new RegExp(`(##+\\s*${titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n##|$)`, 'gi');
    markdown = markdown.replace(regex, match => {
      return `<div class="avoid-break">\n${match.trim()}\n</div>`;
    });
  }

  markdown = markdown.replace(
    /(Sugestão Técnica e detalhada do Analista:[\s\S]+?)(?=\n\n|\n##|$)/g,
    match => `<div class="avoid-break">\n${match.trim()}\n</div>`
  );

  return markdown;
}

async function gerarPdfDoMarkdown(markdown, clientName, analysisType) {
  const htmlContent = `
    <html>
      <head>
        <style>
            body {
  font-family: 'Arial', sans-serif;
  color: #333;
  margin: 20px;
  line-height: 1.6;
}

h1, h2, h3 {
  color: #f57c00;
  background: #fff3e0;
  padding: 10px;
  border-left: 6px solid #f57c00;
  border-radius: 6px;
  margin-top: 40px;
}

h2 { font-size: 22px; }
h3 { font-size: 18px; }

p {
  margin: 10px 0;
}

ul, ol {
  padding-left: 20px;
  margin: 10px 0;
}

.avoid-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 20px 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  vertical-align: top;
}

th {
  background-color: #f57c00;
  color: white;
}

code, pre {
  background: #f5f5f5;
  padding: 10px;
  font-family: 'Courier New', monospace;
  border-radius: 4px;
  overflow-x: auto;
}

hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 30px 0;
}

.highlight-box {
  background: #fff3e0;
  padding: 16px;
  border-left: 6px solid #f57c00;
  border-radius: 6px;
  margin: 20px 0;
}

.title-highlight {
  font-weight: bold;
  font-size: 20px;
  color: #f57c00;
  padding: 10px;
  background: #ffe0b2;
  border-left: 6px solid #f57c00;
  border-radius: 6px;
  margin: 30px 0 10px;
}
        </style>
      </head>
      <body>
        ${marked(markdown)}
      </body>
    </html>
  `;

  let browser = null;
  
  try {
    console.log('🚀 Iniciando geração de PDF...');
    
    // Configuração específica para Render
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--virtual-time-budget=5000',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off'
      ],
      defaultViewport: { width: 1280, height: 720 },
      timeout: 60000
    };

    // Tenta encontrar o Chrome instalado pelo puppeteer
    try {
      const chromePath = puppeteer.executablePath();
      console.log('✅ Chrome encontrado em:', chromePath);
      launchOptions.executablePath = chromePath;
    } catch (error) {
      console.log('⚠️  Usando Chrome padrão do sistema:', error.message);
    }

    console.log('🔧 Iniciando Puppeteer...');
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Configura timeouts mais generosos
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    console.log('📄 Carregando conteúdo HTML...');
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    console.log('🖨️  Gerando PDF...');
    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '15px', right: '15px' },
      timeout: 60000,
      preferCSSPageSize: false
    });

    console.log('✅ PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Erro detalhado ao gerar PDF:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Retorna erro mais específico baseado no tipo de erro
    if (error.message.includes('Protocol error')) {
      throw new Error('Erro de protocolo do Puppeteer. Serviço pode estar sobrecarregado.');
    } else if (error.message.includes('Navigation timeout')) {
      throw new Error('Timeout na navegação. Conteúdo muito grande ou serviço lento.');
    } else if (error.message.includes('Target closed')) {
      throw new Error('Navegador foi fechado inesperadamente.');
    } else {
      throw new Error(`Falha na geração do PDF: ${error.message}`);
    }
  } finally {
    if (browser) {
      try {
        console.log('🔒 Fechando navegador...');
        await browser.close();
      } catch (closeError) {
        console.error('⚠️  Erro ao fechar browser:', closeError);
      }
    }
  }
}

app.post('/analisepdf', async (req, res) => {
  console.log('📥 Recebida requisição para geração de PDF');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('📊 Body size:', JSON.stringify(req.body).length, 'chars');
  
  try {
    const { markdown, analysisType, clientName } = req.body;

    // Validação de entrada melhorada
    if (!markdown || typeof markdown !== 'string') {
      console.log('❌ Markdown ausente ou inválido');
      return res.status(400).json({ 
        error: "Markdown é obrigatório e deve ser uma string",
        received: typeof markdown
      });
    }

    if (!analysisType || typeof analysisType !== 'string') {
      console.log('❌ AnalysisType ausente ou inválido');
      return res.status(400).json({ 
        error: "Tipo de análise é obrigatório",
        received: typeof analysisType
      });
    }

    if (!clientName || typeof clientName !== 'string') {
      console.log('❌ ClientName ausente ou inválido');
      return res.status(400).json({ 
        error: "Nome do cliente é obrigatório",
        received: typeof clientName
      });
    }

    if (!["ads", "account", "express"].includes(analysisType)) {
      console.log('❌ Tipo de análise inválido:', analysisType);
      return res.status(400).json({ 
        error: "Tipo de análise inválido",
        validTypes: ["ads", "account", "express"],
        received: analysisType
      });
    }

    console.log('✅ Validação passou - processando PDF...');
    console.log('👤 Cliente:', clientName);
    console.log('📋 Tipo:', analysisType);
    console.log('📝 Markdown length:', markdown.length);

    // Processa o markdown
    let markdownFinal = calcularCPA(markdown);
    markdownFinal = protegerTopicosImportantes(markdownFinal);
    markdownFinal = protegerBlocosFixos(markdownFinal);

    console.log('🔧 Markdown processado, iniciando geração de PDF...');

    // Gera o PDF
    const pdfBuffer = await gerarPdfDoMarkdown(markdownFinal, clientName, analysisType);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF gerado está vazio');
    }

    console.log('✅ PDF gerado com sucesso!');

    // Define headers para o PDF
    const filename = `${clientName.replace(/[^a-zA-Z0-9]/g, '_')}-${analysisType}-relatorio.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro completo na geração de PDF:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // Retorna erro específico baseado no tipo
    let statusCode = 500;
    let errorMessage = "Erro interno do servidor";
    
    if (error.message.includes('Validation')) {
      statusCode = 400;
      errorMessage = "Dados de entrada inválidos";
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = "Timeout na geração do PDF";
    } else if (error.message.includes('memory')) {
      statusCode = 507;
      errorMessage = "Erro de memória insuficiente";
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      service: 'microservico-analise'
    });
  }
});

app.post('/comparison', async (req, res) => {
  try {
    console.log('🔍 Recebida solicitação de comparação');
    console.log('📊 Dados recebidos:', JSON.stringify(req.body, null, 2));

    const resultado = await processarComparacao(req.body);
    res.json(resultado);

  } catch (error) {
    console.error('❌ Erro ao processar comparação:', error);
    res.status(500).json({
      error: 'Erro ao processar análise comparativa',
      details: error.message
    });
  }
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('🚨 Erro não capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Erro inesperado',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'POST /analise',
      'POST /analisepdf',
      'POST /comparison'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Microserviço de análise rodando na porta ${PORT}`);
  console.log(`🌐 Health check disponível em: http://localhost:${PORT}/health`);
  console.log(`🔧 CORS test disponível em: http://localhost:${PORT}/test-cors`);
});