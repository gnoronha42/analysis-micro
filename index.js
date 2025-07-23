require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');
const { marked } = require('marked');

const cors = require('cors');
const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: [
    'https://shoppe-ai-9px3.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    
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
  try {
    console.log('🚀 Iniciando geração de PDF via Browserless');
    console.log('📝 Tamanho do Markdown:', markdown.length, 'caracteres');

    // 1. Converter markdown para HTML com estilos otimizados para PDF
   // Substitua o trecho da função gerarPdfDoMarkdown - seção do htmlContent:

const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.7;
        color: #2d3748;
        padding: 30px;
        margin: 0;
        background: #ffffff;
        font-size: 14px;
      }

      /* Títulos com gradiente laranja */
      h1 {
        color: #ea580c;
        font-size: 28px;
        font-weight: 700;
        margin: 30px 0 20px 0;
        padding: 20px 0 15px 0;
        border-bottom: 3px solid #fed7aa;
        background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        page-break-after: avoid;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      h2 {
        color: #c2410c;
        font-size: 22px;
        font-weight: 600;
        margin: 25px 0 15px 0;
        padding: 12px 20px;
        background: linear-gradient(135deg, #fed7aa 0%, #ffedd5 100%);
        border-left: 5px solid #ea580c;
        border-radius: 0 8px 8px 0;
        page-break-after: avoid;
        box-shadow: 0 2px 4px rgba(234, 88, 12, 0.1);
      }

      h3 {
        color: #9a3412;
        font-size: 18px;
        font-weight: 600;
        margin: 20px 0 12px 0;
        padding: 8px 15px;
        background: #fff7ed;
        border-left: 3px solid #f97316;
        border-radius: 0 6px 6px 0;
        page-break-after: avoid;
      }

      h4 {
        color: #7c2d12;
        font-size: 16px;
        font-weight: 600;
        margin: 18px 0 10px 0;
        padding: 6px 0;
        border-bottom: 1px solid #fed7aa;
        page-break-after: avoid;
      }

      /* Parágrafos e texto */
      p {
        margin-bottom: 14px;
        text-align: justify;
        color: #374151;
        line-height: 1.8;
      }

      strong {
        color: #c2410c;
        font-weight: 600;
      }

      /* Listas */
      ul, ol {
        margin: 15px 0;
        padding-left: 25px;
      }

      li {
        margin-bottom: 8px;
        color: #4b5563;
        line-height: 1.7;
      }

      li strong {
        color: #ea580c;
      }

      /* Tabelas modernas */
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 20px 0;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(234, 88, 12, 0.1);
        page-break-inside: avoid;
      }

      thead {
        background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      }

      th {
        background: transparent;
        color: #ffffff;
        font-weight: 600;
        padding: 16px 20px;
        text-align: left;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border: none;
      }

      th:first-child {
        border-top-left-radius: 12px;
      }

      th:last-child {
        border-top-right-radius: 12px;
      }

      td {
        padding: 14px 20px;
        border-bottom: 1px solid #fed7aa;
        color: #374151;
        font-size: 13px;
        vertical-align: top;
      }

      tbody tr:nth-child(even) {
        background: #fff7ed;
      }

      tbody tr:hover {
        background: #ffedd5;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:last-child td:first-child {
        border-bottom-left-radius: 12px;
      }

      tbody tr:last-child td:last-child {
        border-bottom-right-radius: 12px;
      }

      /* Valores importantes em destaque */
      .valor-destaque {
        background: linear-gradient(135deg, #fed7aa 0%, #ffedd5 100%);
        padding: 8px 12px;
        border-radius: 6px;
        font-weight: 600;
        color: #c2410c;
        display: inline-block;
        margin: 4px;
      }

      /* Seções especiais */
      .avoid-break {
        page-break-inside: avoid;
        break-inside: avoid;
        background: #fff7ed;
        padding: 20px;
        border-radius: 12px;
        border: 2px solid #fed7aa;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(234, 88, 12, 0.08);
      }

      .avoid-break h2 {
        background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
        color: #ffffff;
        margin: -20px -20px 15px -20px;
        border-radius: 10px 10px 0 0;
        border-left: none;
      }

      /* Citações e observações */
      blockquote {
        border-left: 4px solid #f97316;
        padding: 15px 20px;
        margin: 20px 0;
        background: #fff7ed;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        color: #7c2d12;
      }

      /* Códigos e dados técnicos */
      code {
        background: #ffedd5;
        color: #9a3412;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }

      /* Separadores */
      hr {
        border: none;
        height: 2px;
        background: linear-gradient(135deg, #fed7aa 0%, #ffedd5 100%);
        margin: 30px 0;
        border-radius: 2px;
      }

      /* Estilos para impressão */
      @media print {
        body { 
          margin: 0;
          padding: 20px;
          font-size: 12px;
        }
        
        .avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        h1, h2, h3 {
          page-break-after: avoid;
        }
        
        table {
          page-break-inside: avoid;
        }
        
        /* Força cores para impressão */
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }

      /* Cabeçalho da primeira página */
      .header-logo {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
        border-radius: 12px;
        border: 2px solid #fed7aa;
      }

      /* Rodapé informativo */
      .footer-info {
        margin-top: 30px;
        padding: 15px;
        background: #f8fafc;
        border-top: 2px solid #fed7aa;
        border-radius: 8px;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      }
    </style>
  </head>
  <body>
    ${marked(markdown)}
  </body>
</html>
`;

    // 2. Configurar o token do Browserless
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN
    // CORREÇÃO: Usar endpoint /pdf em vez de /screenshot
    const BROWSERLESS_URL = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;

    // 3. Opções corretas para o PDF conforme documentação
    const options = {
      displayHeaderFooter: false,
      printBackground: true,
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    };

    console.log('🖨️ Enviando para Browserless...');
    const startTime = Date.now();

    // 4. Fazer a requisição para o Browserless com estrutura correta
    const response = await fetch(BROWSERLESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        html: htmlContent,
        options: options // Incluir as opções corretamente
      }),
      timeout: 35000 // timeout de 35 segundos
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Browserless:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Browserless error: ${response.status} - ${errorText}`);
    }

    const pdfBuffer = await response.buffer();
    
    console.log(`✅ PDF gerado em ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    console.log(`📄 Tamanho do PDF: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF gerado está vazio');
    }

    return pdfBuffer;

  } catch (error) {
    console.error('❌ Falha crítica na geração:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Esconder o token no erro
    const cleanError = error.message.replace(/2SioJLZezLDMAl665eb1bf88189c8a20a24b899ee1bad31ad/g, 'REDACTED');
    throw new Error(`Erro na geração do PDF: ${cleanError}`);
  }
}

app.post('/analisepdf', async (req, res) => {
  console.log('📥 Recebida requisição para geração de PDF');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('📊 Body size:', JSON.stringify(req.body).length, 'chars');
  
  try {
    const { markdown, analysisType, clientName } = req.body;

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

    const pdfBuffer = await gerarPdfDoMarkdown(markdownFinal, clientName, analysisType);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF gerado está vazio');
    }

    console.log('✅ PDF gerado com sucesso!');

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

// Endpoint de teste para verificar se o Browserless está funcionando
app.get('/test-browserless', async (req, res) => {
  try {
    const start = Date.now();
    
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '2SioJLZezLDMAl665eb1bf88189c8a20a24b899ee1bad31ad';
    const BROWSERLESS_URL = `https://chrome.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body><h1>Teste Browserless</h1><p>Funcionando!</p></body>
      </html>
    `;

    const response = await fetch(BROWSERLESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: testHtml,
        options: {
          format: 'A4',
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    
    res.json({
      success: true,
      message: 'Browserless está funcionando',
      pdfSize: `${(buffer.length / 1024).toFixed(2)} KB`,
      responseTime: `${((Date.now() - start)/1000).toFixed(2)}s`,
      status: response.status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});


// Função para filtrar apenas itens concluídos do checklist
function filtrarItensCompletados(blocks) {
  return blocks.map(block => ({
    ...block,
    items: block.items.filter(item => item.is_completed === true)
  })).filter(block => block.items.length > 0); // Remove blocos sem itens concluídos
}

// Função para gerar markdown apenas com itens concluídos
function generateCompletedChecklistMarkdown(blocks, clientName) {
  const completedBlocks = filtrarItensCompletados(blocks);
  
  if (completedBlocks.length === 0) {
    return `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName}\n\n*Nenhum item foi concluído ainda.*`;
  }

  let md = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n`;
  md += `**Cliente:** ${clientName}\n`;
  md += `**Data do Relatório:** ${new Date().toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`;

  let totalConcluidos = 0;
  
  completedBlocks.forEach((block, i) => {
    md += `## ${block.title}\n`;
    md += `**Itens Concluídos:** ${block.items.length}\n\n`;
    
    block.items.forEach((item, idx) => {
      totalConcluidos++;
      md += `### ✓ ${item.title}\n`;
      
      if (item.description) {
        md += `**Descrição:** ${item.description}\n\n`;
      }
      
      if (item.completed_at) {
        const dataFormatada = new Date(item.completed_at).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        md += `**✅ Concluído em:** ${dataFormatada}\n\n`;
      } else {
        md += `**✅ Status:** Concluído\n\n`;
      }
      
      md += `---\n\n`;
    });
  });

  md += `## 📊 RESUMO EXECUTIVO\n\n`;
  md += `- **Total de Itens Concluídos:** ${totalConcluidos}\n`;
  md += `- **Blocos com Atividades Finalizadas:** ${completedBlocks.length}\n`;
  md += `- **Taxa de Progresso:** Itens selecionados concluídos\n\n`;

  return md;
}

// Função HTML específica para itens concluídos
function gerarHtmlChecklistConcluidos(markdown, clientName) {
  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Checklist Concluído - ${clientName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.8;
        color: #1f2937;
        padding: 30px;
        margin: 0;
        background: #ffffff;
        font-size: 14px;
      }

      /* Cabeçalho principal - Verde para concluídos */
      .header-checklist {
        text-align: center;
        margin-bottom: 40px;
        padding: 30px;
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-radius: 15px;
        border: 3px solid #bbf7d0;
        box-shadow: 0 8px 25px rgba(34, 197, 94, 0.15);
      }

      .header-checklist h1 {
        color: #15803d;
        font-size: 32px;
        font-weight: 700;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: linear-gradient(135deg, #15803d 0%, #22c55e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .header-checklist .client-info {
        color: #166534;
        font-size: 16px;
        font-weight: 600;
        margin-top: 15px;
        line-height: 1.6;
      }

      /* Títulos principais */
      h1 {
        color: #15803d;
        font-size: 28px;
        font-weight: 700;
        margin: 30px 0 20px 0;
        padding: 20px 0 15px 0;
        border-bottom: 3px solid #bbf7d0;
        background: linear-gradient(135deg, #15803d 0%, #22c55e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        page-break-after: avoid;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      h2 {
        color: #ffffff;
        font-size: 22px;
        font-weight: 600;
        margin: 25px 0 15px 0;
        padding: 15px 25px;
        background: linear-gradient(135deg, #15803d 0%, #166534 100%);
        border-radius: 10px;
        page-break-after: avoid;
        box-shadow: 0 4px 8px rgba(21, 128, 61, 0.2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      h3 {
        color: #15803d;
        font-size: 18px;
        font-weight: 600;
        margin: 20px 0 12px 0;
        padding: 12px 20px;
        background: #f0fdf4;
        border-left: 4px solid #22c55e;
        border-radius: 0 8px 8px 0;
        page-break-after: avoid;
        display: flex;
        align-items: center;
      }

      h3:before {
        content: '✅';
        margin-right: 10px;
        font-size: 20px;
      }

      /* Conteúdo dos itens concluídos */
      p {
        margin: 12px 0;
        color: #374151;
        line-height: 1.7;
      }

      strong {
        color: #15803d;
        font-weight: 600;
      }

      /* Data/hora de conclusão - Destaque especial */
      p:contains('Concluído em') {
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        padding: 12px 20px;
        border-radius: 8px;
        border-left: 4px solid #22c55e;
        font-weight: 600;
        color: #166534;
        margin: 15px 0;
        box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
      }

      /* Separadores */
      hr {
        border: none;
        height: 2px;
        background: linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%);
        margin: 25px 0;
        border-radius: 2px;
      }

      /* Resumo executivo */
      h2:contains('RESUMO EXECUTIVO') {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        color: white;
        text-align: center;
        padding: 20px;
        border-radius: 12px;
        margin-top: 40px;
      }

      /* Lista do resumo */
      ul {
        background: #f0fdf4;
        padding: 20px 30px;
        border-radius: 10px;
        border-left: 4px solid #22c55e;
        margin: 20px 0;
      }

      li {
        margin: 8px 0;
        color: #166534;
        font-weight: 500;
        list-style-type: none;
        position: relative;
        padding-left: 25px;
      }

      li:before {
        content: '📊';
        position: absolute;
        left: 0;
        top: 0;
      }

      /* Rodapé */
      .footer-info {
        margin-top: 40px;
        padding: 20px;
        background: linear-gradient(135deg, #f9fafb 0%, #f0fdf4 100%);
        border-top: 3px solid #bbf7d0;
        border-radius: 10px;
        text-align: center;
      }

      .footer-info small {
        font-size: 12px;
        color: #166534;
        font-weight: 500;
      }

      /* Badge de status */
      .status-badge {
        display: inline-block;
        background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-left: 10px;
      }

      /* Estilos para impressão */
      @media print {
        body { 
          margin: 0;
          padding: 15px;
          font-size: 12px;
        }
        
        h1, h2, h3 {
          page-break-after: avoid;
        }
        
        /* Força cores para impressão */
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="header-checklist">
      <h1>✅ Relatório de Atividades Concluídas</h1>
      <div class="client-info">
        <strong>Cliente:</strong> ${clientName}<br>
        <strong>Tipo:</strong> Checklist Operacional - Itens Finalizados
      </div>
    </div>
    
    ${marked(markdown)}
    
    <div class="footer-info">
      <small>
        Relatório gerado automaticamente • Somente itens concluídos • 
        ${new Date().toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </small>
    </div>
  </body>
</html>
`;

  return htmlContent;
}

// Modificação na função ClientChecklist para incluir o botão de PDF de concluídos


// Função para filtrar blocos com pelo menos um item concluído do checklist
function filtrarBlocosComAlgumConcluido(blocks) {
  return blocks
    .map(block => ({
      ...block,
      items: block.items.filter(item => item.is_completed === true)
    }))
    .filter(block => block.items.length > 0);
}

// Função para gerar markdown apenas com blocos com pelo menos um item concluído
function generateCompletedChecklistMarkdown(blocks, clientName) {
  const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);
  
  if (completedBlocks.length === 0) {
    return `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName}\n\n*Nenhum item foi concluído ainda.*`;
  }

  let md = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n`;
  md += `**Cliente:** ${clientName}\n`;
  md += `**Data do Relatório:** ${new Date().toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`;

  let totalConcluidos = 0;
  
  completedBlocks.forEach((block, i) => {
    md += `## ${block.title}\n`;
    md += `**Itens Concluídos:** ${block.items.length}\n\n`;
    
    block.items.forEach((item, idx) => {
      totalConcluidos++;
      md += `### ✓ ${item.title}\n`;
      
      if (item.description) {
        md += `**Descrição:** ${item.description}\n\n`;
      }
      
      if (item.completed_at) {
        const dataFormatada = new Date(item.completed_at).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        md += `**✅ Concluído em:** ${dataFormatada}\n\n`;
      } else {
        md += `**✅ Status:** Concluído\n\n`;
      }
      
      md += `---\n\n`;
    });
  });

  md += `## 📊 RESUMO EXECUTIVO\n\n`;
  md += `- **Total de Itens Concluídos:** ${totalConcluidos}\n`;
  md += `- **Blocos com Atividades Finalizadas:** ${completedBlocks.length}\n`;
  md += `- **Taxa de Progresso:** Blocos com pelo menos um item concluído\n\n`;

  return md;
}

// Nova rota no servidor Express para PDF de itens concluídos
app.post('/checklist-completed-pdf', async (req, res) => {
  console.log('📥 Recebida requisição para PDF de itens concluídos');
  
  try {
    const { blocks, clientName, markdown } = req.body;

    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ 
        error: "Blocos do checklist são obrigatórios",
        received: typeof blocks
      });
    }

    if (!clientName || typeof clientName !== 'string') {
      return res.status(400).json({ 
        error: "Nome do cliente é obrigatório",
        received: typeof clientName
      });
    }

    // Filtrar apenas blocos com pelo menos um item concluído
    const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);

    if (completedBlocks.length === 0) {
      return res.status(400).json({
        error: "Nenhum item concluído para gerar o PDF."
      });
    }

    console.log('✅ Processando PDF de itens concluídos...');
    console.log('👤 Cliente:', clientName);
    console.log('📊 Blocos com itens concluídos:', completedBlocks.length);

    // Gerar markdown apenas com os blocos e itens concluídos
    const finalMarkdown = generateCompletedChecklistMarkdown(completedBlocks, clientName);
    
    // Gerar HTML específico para itens concluídos
    const htmlContent = gerarHtmlChecklistConcluidos(finalMarkdown, clientName);

    // Configurar Browserless
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    const BROWSERLESS_URL = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;

    const options = {
      displayHeaderFooter: false,
      printBackground: true,
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    };

    console.log('🖨️ Gerando PDF...');
    const startTime = Date.now();

    const response = await fetch(BROWSERLESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        html: htmlContent,
        options: options
      }),
      timeout: 35000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Browserless:', response.status, errorText);
      throw new Error(`Browserless error: ${response.status}`);
    }

    const pdfBuffer = await response.buffer();
    
    console.log(`✅ PDF de itens concluídos gerado em ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    console.log(`📄 Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    const filename = `checklist_concluidos_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro na geração de PDF de itens concluídos:', error);
    
    res.status(500).json({
      error: 'Erro ao gerar PDF de itens concluídos',
      details: error.message,
      timestamp: new Date().toISOString()
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Microserviço de análise rodando na porta ${PORT}`);
  console.log(`🧪 Teste o Browserless em: http://localhost:${PORT}/test-browserless`);
});