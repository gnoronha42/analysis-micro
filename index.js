require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
        '--disable-javascript',
        '--virtual-time-budget=1000',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      defaultViewport: { width: 1280, height: 720 },
      timeout: 30000
    };

    // Tenta encontrar o Chrome instalado pelo puppeteer
    try {
      const chromePath = puppeteer.executablePath();
      console.log('Chrome encontrado em:', chromePath);
      launchOptions.executablePath = chromePath;
    } catch (error) {
      console.log('Usando Chrome padrão do sistema:', error.message);
      // Remove executablePath para usar o Chrome do sistema
    }

    console.log('Iniciando Puppeteer com opções:', launchOptions);
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Configura timeouts mais generosos
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '15px', right: '15px' },
      timeout: 30000
    });

    console.log('PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
    return pdfBuffer;

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error(`Falha na geração do PDF: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Erro ao fechar browser:', closeError);
      }
    }
  }
}

app.post('/analisepdf', async (req, res) => {
  try {
    const { markdown, analysisType, clientName } = req.body;

    if (!markdown || !analysisType || !clientName) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (!["ads", "account", "express"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    let markdownFinal = calcularCPA(markdown);
    markdownFinal = protegerTopicosImportantes(markdownFinal);
    markdownFinal = protegerBlocosFixos(markdownFinal);

    const pdfBuffer = await gerarPdfDoMarkdown(markdownFinal, clientName, analysisType);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${clientName}-${analysisType}-relatorio.pdf`
    );

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro na geração de PDF:', error);
    res.status(500).json({
      error: error.message || "Erro interno do servidor",
      details: "Falha na geração da análise",
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Microserviço de análise rodando na porta ${PORT}`);
});