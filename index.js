require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');
const { processarCSVAnuncios, gerarInsightsCSV } = require("./csv-processor");
const { marked } = require('marked');

const cors = require('cors');
const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: [
    'https://shoppe-ai-9px3.vercel.app',
    'https://www.selleria.com.br',
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
  console.log('🧮 Iniciando cálculo do CPA...');
  console.log('📝 Markdown recebido (primeiros 300 chars):', markdown.substring(0, 300));
  
  // Múltiplas estratégias para encontrar investimento e pedidos
  let investimento = null;
  let pedidos = null;
  
  // Estratégia 1: Buscar investimento e pedidos separadamente (mais robusto)
  const investimentoMatch = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
  if (investimentoMatch) {
    investimento = parseFloat(investimentoMatch[1].replace(/\./g, '').replace(',', '.'));
    console.log('📊 Estratégia 1 - Investimento encontrado:', investimento);
  }
  
  const pedidosMatch = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*([\d.]+)\s*\|/i);
  if (pedidosMatch) {
    pedidos = parseInt(pedidosMatch[1].replace(/\./g, ''));
    console.log('📊 Estratégia 1 - Pedidos encontrados:', pedidos);
  }
  
  // Estratégia 2: Buscar por padrões de texto mais flexíveis
  if (!investimento) {
    // Buscar investimento em Ads
    const investimentoMatch2 = markdown.match(/(?:Investimento\s+(?:em\s+)?Ads?|Investimento\s+total\s+em\s+Ads?)\s*[:|]\s*R\$\s*([\d.,]+)/i);
    if (investimentoMatch2) {
      investimento = parseFloat(investimentoMatch2[1].replace(/\./g, '').replace(',', '.'));
      console.log('📊 Estratégia 2 - Investimento encontrado:', investimento);
    }
  }
  
  if (!pedidos) {
    // Buscar pedidos pagos
    const pedidosMatch2 = markdown.match(/(?:Pedidos\s+Pagos(?:\s+Mês)?|Pedidos\s+via\s+Ads?|Pedidos\s+Pagos\s+Mês)\s*[:|]\s*([\d.]+)/i);
    if (pedidosMatch2) {
      pedidos = parseInt(pedidosMatch2[1].replace(/\./g, ''));
      console.log('📊 Estratégia 2 - Pedidos encontrados:', pedidos);
    }
  }
  
  // Estratégia 3: Buscar por valores na tabela de forma mais genérica
  if (!investimento) {
    // Buscar qualquer valor R$ na linha do investimento
    const investimentoLinha = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
    if (investimentoLinha) {
      investimento = parseFloat(investimentoLinha[1].replace(/\./g, '').replace(',', '.'));
      console.log('📊 Estratégia 3 - Investimento na linha:', investimento);
    }
  }
  
  if (!pedidos) {
    // Buscar qualquer número na linha dos pedidos
    const pedidosLinha = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*([\d.]+)\s*\|/i);
    if (pedidosLinha) {
      pedidos = parseInt(pedidosLinha[1].replace(/\./g, ''));
      console.log('📊 Estratégia 3 - Pedidos na linha:', pedidos);
    }
  }
  
  // Estratégia 4: Buscar por valores isolados no contexto
  if (!investimento) {
    // Buscar investimento próximo à palavra "Ads"
    const investimentoContexto = markdown.match(/R\$\s*([\d.,]+)(?=\s*[^|]*Ads)/i);
    if (investimentoContexto) {
      investimento = parseFloat(investimentoContexto[1].replace(/\./g, '').replace(',', '.'));
      console.log('📊 Estratégia 4 - Investimento no contexto:', investimento);
    }
  }
  
  if (!pedidos) {
    // Buscar pedidos próximo à palavra "Pedidos"
    const pedidosContexto = markdown.match(/([\d.]+)(?=\s*[^|]*Pedidos)/i);
    if (pedidosContexto) {
      pedidos = parseInt(pedidosContexto[1].replace(/\./g, ''));
      console.log('📊 Estratégia 4 - Pedidos no contexto:', pedidos);
    }
  }
  
  // Estratégia 5: Busca mais agressiva para dados
  if (!investimento) {
    // Buscar qualquer valor R$ na linha que contenha "Investimento"
    const investimentoAgressivo = markdown.match(/\|\s*[^|]*Investimento[^|]*\|\s*R\$\s*([\d.,]+)\s*\|/i);
    if (investimentoAgressivo) {
      investimento = parseFloat(investimentoAgressivo[1].replace(/\./g, '').replace(',', '.'));
      console.log('📊 Estratégia 5 - Investimento agressivo:', investimento);
    }
  }
  
  if (!pedidos) {
    // Buscar qualquer número na linha que contenha "Pedidos"
    const pedidosAgressivo = markdown.match(/\|\s*[^|]*Pedidos[^|]*\|\s*([\d.]+)\s*\|/i);
    if (pedidosAgressivo) {
      pedidos = parseInt(pedidosAgressivo[1].replace(/\./g, ''));
      console.log('📊 Estratégia 5 - Pedidos agressivo:', pedidos);
    }
  }

  console.log('💰 Investimento final:', investimento);
  console.log('📦 Pedidos finais:', pedidos);

  if (investimento && pedidos && pedidos > 0 && !isNaN(investimento)) {
    const cpa = (investimento / pedidos).toFixed(2);
    const cpaFormatado = cpa.replace('.', ',');
    console.log('🎯 CPA calculado:', cpaFormatado);
    console.log('🧮 Cálculo:', `${investimento} ÷ ${pedidos} = ${cpa}`);
    
    let markdownAtualizado = markdown;
    
    // Limpar linha malformada do CPA primeiro
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*R\$[\d.,]+\s*\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar qualquer CPA malformado primeiro (incluindo RCPA)
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*R?CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar RCPA isolado
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*RCPA\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar RCPA em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(
      /RCPA/g,
      'Dado não informado'
    );
    
    // Limpar CPA malformado em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*R[^|]*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Atualizar CPA em todas as ocorrências possíveis
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*(?:Médio|via Ads|geral)?\s*[:|])\s*(?:Dado não informado|R\$\s*[\d.,]+|R?CPA\s*\|\s*[\d.,]+)/gi,
      `$1 ${cpaFormatado}`
    );
    
    // Atualizar CPA na tabela se existir
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*)(?:Dado não informado|R\$\s*[\d.,]+|R?CPA\s*\|\s*[\d.,]+)(\s*\|)/gi,
      `$1${cpaFormatado}$2`
    );
    
    // Forçar atualização de qualquer CPA existente (incluindo RCPA)
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*[:|]\s*)R?CPA/gi,
      `$1${cpaFormatado}`
    );
    
    // Forçar atualização de qualquer CPA existente
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*[:|]\s*)R\$\s*[\d.,]+/gi,
      `$1${cpaFormatado}`
    );
    
    // Substituição específica para tabelas markdown
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    // Corrigir qualquer linha de tabela que contenha CPA
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*.*?\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    // Remover colunas extras do CPA se existirem
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*R\$[\d.,]+\s*)\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '$1|'
    );
    
    // Adicionar CPA na tabela se não existir
    if (!markdownAtualizado.includes(`CPA | ${cpaFormatado}`)) {
      // Tentar adicionar após investimento
      markdownAtualizado = markdownAtualizado.replace(
        /(\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$[\d.,]+\s*\|)/i,
        `$1\n| CPA | ${cpaFormatado} |`
      );
      
      // Se ainda não encontrou, tentar após ROAS
      if (!markdownAtualizado.includes(`CPA | ${cpaFormatado}`)) {
        markdownAtualizado = markdownAtualizado.replace(
          /(\|\s*ROAS\s*\|\s*[\d.,]+\s*\|)/i,
          `$1\n| CPA | ${cpaFormatado} |`
        );
      }
    }
    
    // Verificação final: forçar atualização de qualquer CPA restante
    const cpaEscaped = cpaFormatado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markdownAtualizado = markdownAtualizado.replace(
      new RegExp(`\\|\\s*CPA\\s*\\|\\s*(?!${cpaEscaped})[^|]*\\|`, 'gi'),
      `| CPA | ${cpaFormatado} |`
    );
    
    // Última verificação: substituir qualquer CPA restante
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*(?!4,96)[^|]*\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    console.log('✅ CPA atualizado no markdown');
    
    // Verificação final: confirmar que o CPA foi atualizado
    if (markdownAtualizado.includes(cpaFormatado)) {
      console.log('✅ Verificação: CPA encontrado no markdown final');
      console.log('📝 Markdown final (primeiros 500 chars):', markdownAtualizado.substring(0, 500));
      
      // Verificar se ainda há RCPA no resultado
      if (markdownAtualizado.includes('RCPA')) {
        console.log('⚠️ ATENÇÃO: RCPA ainda presente! Tentando limpeza final...');
        markdownAtualizado = markdownAtualizado.replace(/RCPA/g, cpaFormatado);
        console.log('🧹 Limpeza final aplicada');
      }
    } else {
      console.log('⚠️ Verificação: CPA NÃO encontrado no markdown final');
    }
    
    return markdownAtualizado;
  } else {
    console.log('⚠️ Não foi possível calcular CPA - dados insuficientes ou inválidos');
    console.log('Investimento:', investimento, 'Pedidos:', pedidos);
    
    // Tentar encontrar os dados de forma mais agressiva
    console.log('🔍 Buscando dados de forma mais agressiva...');
    const todosValores = markdown.match(/R\$\s*([\d.,]+)/g);
    const todosNumeros = markdown.match(/(\d+)/g);
    console.log('💰 Todos os valores R$ encontrados:', todosValores);
    console.log('🔢 Todos os números encontrados:', todosNumeros);
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

    console.log('📝 Markdown da IA (primeiros 500 chars):', markdownFinal.substring(0, 500));

    // Calcular CPA antes de retornar a análise
    markdownFinal = calcularCPA(markdownFinal);
    
    console.log('🧮 Markdown após cálculo do CPA (primeiros 500 chars):', markdownFinal.substring(0, 500));

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

// Nova rota para análise de CSV
app.post('/analise-csv', async (req, res) => {
  try {
    const { csvContent, analysisType, clientName } = req.body;

    console.log('📊 Recebida requisição de análise CSV');
    console.log('👤 Cliente:', clientName);
    console.log('📋 Tipo:', analysisType);
    console.log('📄 Tamanho do CSV:', csvContent?.length || 0);

    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: "Conteúdo CSV é obrigatório" });
    }

    if (analysisType !== "ads") {
      return res.status(400).json({ error: "Análise CSV disponível apenas para tipo 'ads'" });
    }

    // Processar CSV
    const dadosProcessados = processarCSVAnuncios(csvContent);
    const insights = gerarInsightsCSV(dadosProcessados);
    
    // Criar prompt específico para CSV com dados estruturados
    const csvPrompt = `${ADVANCED_ADS_PROMPT}

🚨 ANÁLISE BASEADA EM DADOS CSV ESTRUTURADOS - SHOPEE ADS 🚨

⚠️ INSTRUÇÕES CRÍTICAS - LEIA PRIMEIRO:
1. **NUNCA INVERTA OS VALORES**: Despesas = Investimento | GMV = Receita
2. **VALIDAÇÃO OBRIGATÓRIA**: Se ROAS > 50x, há erro de interpretação
3. **INTERPRETAÇÃO CORRETA**: ROAS = GMV ÷ Despesas (use valores corretos)
4. **EXEMPLO REAL**: Despesas R$ 1.543,25 + GMV R$ 11.001,02 = ROAS 7,13x (CORRETO)
5. **JAMAIS DIGA**: "ROAS 1.543,25x" (isso seria impossível - é o valor das despesas!)

**DADOS DA LOJA:**
- Nome da Loja: ${insights.dadosLoja.nomeLoja}
- Nome de Usuário: ${insights.dadosLoja.nomeUsuario}
- ID da Loja: ${insights.dadosLoja.idLoja}
- Período do Relatório: ${insights.dadosLoja.periodo}
- Data de Criação: ${insights.dadosLoja.dataRelatorio}

**RESUMO GERAL VALIDADO:**
- Total de Anúncios: ${insights.resumoGeral.totalAnuncios}
- Anúncios Ativos: ${insights.resumoGeral.anunciosAtivos}
- Anúncios Pausados: ${insights.resumoGeral.anunciosPausados}
- Anúncios Encerrados: ${insights.resumoGeral.anunciosEncerrados}
- **INVESTIMENTO TOTAL**: R$ ${insights.resumoGeral.totalDespesas.toFixed(2)}
- **RECEITA TOTAL (GMV)**: R$ ${insights.resumoGeral.totalGMV.toFixed(2)}
- **ROAS GERAL CORRETO**: ${insights.resumoGeral.roasGeral}x
- **CONVERSÕES TOTAIS**: ${insights.resumoGeral.totalConversoes}
- **CPA MÉDIO**: R$ ${insights.resumoGeral.cpaMedio}

🔍 **VALIDAÇÃO DOS DADOS:**
- Se ROAS geral = ${insights.resumoGeral.roasGeral}x e é > 4x → CONTA SAUDÁVEL
- Se ROAS geral = ${insights.resumoGeral.roasGeral}x e é > 6x → CONTA MUITO BOA
- Se ROAS geral = ${insights.resumoGeral.roasGeral}x e é > 8x → CONTA ESCALÁVEL

**PRODUTOS PRINCIPAIS (USE ESTES VALORES EXATOS):**
${dadosProcessados.anuncios.slice(0, 10).map((anuncio, i) => {
  const roasValidado = anuncio.despesas > 0 ? (anuncio.gmv / anuncio.despesas).toFixed(2) : '0.00';
  return `${i+1}. ${anuncio.nome}
     - Status: ${anuncio.status}
     - **INVESTIMENTO**: R$ ${anuncio.despesas.toFixed(2)}
     - **RECEITA (GMV)**: R$ ${anuncio.gmv.toFixed(2)}
     - **ROAS VALIDADO**: ${roasValidado}x ${roasValidado > 8 ? '✅ ESCALÁVEL' : roasValidado > 6 ? '✅ MUITO BOM' : roasValidado > 4 ? '✅ BOM' : '❌ BAIXO'}
     - Conversões: ${anuncio.conversoes}
     - CTR: ${anuncio.ctr}%
     - Taxa Conversão: ${anuncio.taxaConversao}%`;
}).join('\n\n')}

🚨 **INTERPRETAÇÃO OBRIGATÓRIA:**
1. Se produto tem ROAS > 6x → "Excelente performance, acima do benchmark"
2. Se produto tem ROAS > 4x → "Performance saudável"
3. Se produto tem ROAS < 4x → "Precisa otimização"
4. **NUNCA** diga valores impossíveis como "ROAS 1.543x" ou "conversão 256%"
5. **SEMPRE** use os valores GMV e Despesas corretos para calcular ROAS

**DIAGNÓSTICO CORRETO:**
Com ROAS geral de ${insights.resumoGeral.roasGeral}x, esta conta demonstra ${insights.resumoGeral.roasGeral > 6 ? 'excelente' : insights.resumoGeral.roasGeral > 4 ? 'boa' : 'baixa'} performance. 
${insights.resumoGeral.roasGeral > 6 ? 'Foque em escalar os produtos de melhor performance.' : insights.resumoGeral.roasGeral > 4 ? 'Otimize produtos com ROAS baixo e escale os melhores.' : 'Revise estratégia geral e otimize campanhas.'}

Gere um relatório baseado exclusivamente nestes dados VALIDADOS e CORRETOS.`;

    // Gerar análise com IA usando os dados estruturados
    let markdownFinal = await gerarAnaliseComIA(
      csvPrompt,
      [], // Não há imagens para CSV
      analysisType,
      [JSON.stringify(insights, null, 2)] // Passar insights como OCR text
    );

    console.log('📝 Análise CSV gerada com sucesso');

    res.json({
      analysis: markdownFinal,
      analysisType,
      clientName: clientName || "Cliente",
      timestamp: new Date().toISOString(),
      csvData: {
        totalAnuncios: insights.resumoGeral.totalAnuncios,
        roasGeral: insights.resumoGeral.roasGeral,
        totalGMV: insights.resumoGeral.totalGMV,
        totalDespesas: insights.resumoGeral.totalDespesas
      }
    });

  } catch (error) {
    console.error('❌ Erro na análise CSV:', error);
    res.status(500).json({
      error: error.message || "Erro interno do servidor",
      details: "Falha na análise do CSV",
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
    console.log('📝 Markdown original recebido (primeiros 500 chars):', markdown.substring(0, 500));
    
    let markdownFinal = calcularCPA(markdown);
    console.log('🧮 Após cálculo do CPA (primeiros 500 chars):', markdownFinal.substring(0, 500));
    
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

// Endpoint de teste para verificar se o cálculo do CPA está funcionando
app.get('/test-cpa', async (req, res) => {
  try {
    const testMarkdown = `## 📊 RELATÓRIO DE ANÁLISE DE CONTA – SHOPEE
Loja: naty_store  
Período Analisado: Último mês (19/04/2025 – 18/05/2025, comparativo mês anterior)  
Objetivo: Diagnóstico completo e orientações estratégicas para crescimento sustentável e aumento de vendas.

| Indicador             | Valor      |
|-----------------------|------------|
| Visitantes Mês        | 18.267     |
| CPA                   | Dado não informado |
| GMV Mês               | R$3.955,50 |
| Pedidos Pagos Mês     | 3          |
| Taxa de Conversão Mês | 3,35%      |
| Investimento em Ads   | R$3.955,50 |
| Ticket Médio Mês      | R$33,89    |
| ROAS                  | 8.55       |`;

    console.log('🧪 Testando cálculo do CPA...');
    const markdownComCPA = calcularCPA(testMarkdown);
    
    // CPA esperado: R$3.955,50 ÷ 3 = R$1.318,50
    const cpaEsperado = 'R$1.318,50';
    const cpaCalculado = markdownComCPA.includes(cpaEsperado);
    
    res.json({
      success: true,
      original: testMarkdown,
      processed: markdownComCPA,
      cpaEsperado: cpaEsperado,
      cpaCalculado: cpaCalculado,
      cpaEncontrado: markdownComCPA.includes('R$'),
      message: 'Teste de cálculo do CPA concluído',
      debug: {
        investimento: 3955.50,
        pedidos: 3,
        cpaCalculado: (3955.50 / 3).toFixed(2)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para testar o problema específico do CPA
app.post('/test-cpa-problema', async (req, res) => {
  try {
    const { markdown } = req.body;
    
    if (!markdown) {
      return res.status(400).json({ error: "Markdown é obrigatório" });
    }
    
    console.log('🧪 Testando CPA com markdown real...');
    console.log('📝 Markdown recebido (primeiros 500 chars):', markdown.substring(0, 500));
    
    const markdownComCPA = calcularCPA(markdown);
    
    // Verificar se o CPA foi calculado
    const cpaEncontrado = markdownComCPA.match(/R\$\s*[\d.,]+/g);
    
    res.json({
      success: true,
      originalLength: markdown.length,
      processedLength: markdownComCPA.length,
      cpaEncontrado: cpaEncontrado,
      markdownProcessado: markdownComCPA.substring(0, 1000),
      message: 'Teste de CPA com markdown real concluído'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para testar especificamente o caso da naty_store
app.get('/test-naty-cpa', async (req, res) => {
  try {
    const testMarkdown = `## 📊 RELATÓRIO DE ANÁLISE DE CONTA – SHOPEE
Loja: naty_store  
Período Analisado: Último mês (19/04/2025 – 18/05/2025, comparativo mês anterior)  
Objetivo: Diagnóstico completo e orientações estratégicas para crescimento sustentável e aumento de vendas.

| Indicador             | Valor      |
|-----------------------|------------|
| Visitantes Mês        | 18.267     |
| CPA                   | R$19,54    |
| GMV Mês               | R$3.955,50 |
| Pedidos Pagos Mês     | 32         |
| Taxa de Conversão Mês | 0,17%      |
| Investimento em Ads   | R$625,20   |
| Ticket Médio Mês      | R$123,61   |
| ROAS                  | 5,61       |`;

    console.log('🧪 Testando CPA específico da naty_store...');
    const markdownComCPA = calcularCPA(testMarkdown);
    
    // CPA esperado: R$625,20 ÷ 32 = 19,54
    const cpaEsperado = '19,54';
    const cpaCalculado = markdownComCPA.includes(cpaEsperado);
    
    res.json({
      success: true,
      original: testMarkdown,
      processed: markdownComCPA,
      cpaEsperado: cpaEsperado,
      cpaCalculado: cpaCalculado,
      cpaEncontrado: markdownComCPA.includes('R$'),
      message: 'Teste de CPA da naty_store concluído',
              debug: {
          investimento: 625.20,
          pedidos: 32,
          cpaCalculado: (625.20 / 32).toFixed(2).replace('.', ',')
        }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para testar o problema real do RCPA
app.post('/test-rcpa-problema', async (req, res) => {
  try {
    const { markdown } = req.body;
    
    if (!markdown) {
      return res.status(400).json({ error: "Markdown é obrigatório" });
    }
    
    console.log('🧪 Testando problema real do RCPA...');
    console.log('📝 Markdown recebido (primeiros 500 chars):', markdown.substring(0, 500));
    
    // Simular o problema: adicionar RCPA no markdown
    const markdownComRCPA = markdown.replace(
      /\|\s*CPA\s*\|\s*R\$\s*[\d.,]+\s*\|/gi,
      '| CPA | RCPA |'
    );
    
    console.log('⚠️ Markdown com RCPA simulado (primeiros 500 chars):', markdownComRCPA.substring(0, 500));
    
    // Aplicar a função calcularCPA
    const markdownCorrigido = calcularCPA(markdownComRCPA);
    
    // Verificar se o RCPA foi removido
    const rcpaRemovido = !markdownCorrigido.includes('RCPA');
    const cpaCorreto = markdownCorrigido.includes('R$19,54');
    
    res.json({
      success: true,
      originalLength: markdown.length,
      rcpaSimulado: markdownComRCPA.substring(0, 1000),
      corrigido: markdownCorrigido.substring(0, 1000),
      rcpaRemovido: rcpaRemovido,
      cpaCorreto: cpaCorreto,
      message: 'Teste de correção do RCPA concluído'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
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
  console.log('📝 Iniciando geração de markdown para checklist concluído');
  console.log('👤 Nome do cliente recebido na função:', clientName);
  console.log('📊 Blocos recebidos:', blocks.length);
  
  const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);
  console.log('📊 Blocos com itens concluídos:', completedBlocks.length);
  
  if (completedBlocks.length === 0) {
    const markdownVazio = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName}\n\n*Nenhum item foi concluído ainda.*`;
    console.log('📝 Markdown vazio gerado:', markdownVazio);
    console.log('👤 Nome do cliente no markdown vazio:', markdownVazio.includes(clientName));
    return markdownVazio;
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

  console.log('📝 Markdown inicial gerado (primeiros 200 chars):', md.substring(0, 200));
  console.log('👤 Nome do cliente no markdown inicial:', md.includes(clientName));

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

  console.log('📝 Markdown final gerado (primeiros 500 chars):', md.substring(0, 500));
  console.log('👤 Nome do cliente no markdown final:', md.includes(clientName));
  console.log('📊 Total de caracteres no markdown:', md.length);

  return md;
}

// Função HTML específica para itens concluídos
function gerarHtmlChecklistConcluidos(markdown, clientName) {
  console.log('🔧 Gerando HTML para checklist concluídos');
  console.log('👤 Nome do cliente recebido:', clientName);
  console.log('📝 Markdown recebido (primeiros 200 chars):', markdown.substring(0, 200));
  
  // Adiciona uma página separada para o resumo executivo
  // e evita quebra de página dentro do bloco do resumo
  const htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Checklist Concluídos - ${clientName}</title>
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

.table {
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

.executive-summary-page {
  page-break-before: always;
  page-break-inside: avoid;
  break-inside: avoid;
}

.client-header {
  background: linear-gradient(135deg, #f57c00 0%, #ff9800 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(245, 124, 0, 0.3);
}

.client-header h1 {
  color: white;
  background: none;
  border: none;
  margin: 0;
  padding: 0;
  font-size: 28px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.client-header p {
  margin: 10px 0 0 0;
  font-size: 16px;
  opacity: 0.9;
}
        </style>
      </head>
      <body>
        <div class="client-header">
          <h1>✅ CHECKLIST OPERACIONAL</h1>
          <p><strong>Cliente:</strong> ${clientName}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        ${splitMarkdownWithExecutiveSummary(marked, markdown)}
      </body>
    </html>
  `;
  
  console.log('✅ HTML gerado com sucesso');
  console.log('👤 Nome do cliente incluído no HTML:', htmlContent.includes(clientName));
  
  return htmlContent;
}

// Função auxiliar para separar o resumo executivo em uma página nova
function splitMarkdownWithExecutiveSummary(marked, markdown) {
  // Divide o markdown em duas partes: antes e depois do resumo executivo
  const resumoRegex = /(^|\n)(## +📊 RESUMO EXECUTIVO[\s\S]*)/i;
  const match = markdown.match(resumoRegex);
  if (!match) {
    // Não encontrou o resumo, retorna tudo normalmente
    return marked(markdown);
  }
  const beforeResumo = markdown.slice(0, match.index);
  const resumo = match[2];
  return `
    ${marked(beforeResumo)}
    <div class="executive-summary-page">
      ${marked(resumo)}
    </div>
  `;
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
  console.log('📝 Iniciando geração de markdown para checklist concluído');
  console.log('👤 Nome do cliente recebido na função:', clientName);
  console.log('📊 Blocos recebidos:', blocks.length);
  
  const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);
  console.log('📊 Blocos com itens concluídos:', completedBlocks.length);
  
  if (completedBlocks.length === 0) {
    const markdownVazio = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName}\n\n*Nenhum item foi concluído ainda.*`;
    console.log('📝 Markdown vazio gerado:', markdownVazio);
    console.log('👤 Nome do cliente no markdown vazio:', markdownVazio.includes(clientName));
    return markdownVazio;
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

  console.log('📝 Markdown inicial gerado (primeiros 200 chars):', md.substring(0, 200));
  console.log('👤 Nome do cliente no markdown inicial:', md.includes(clientName));

  let totalConcluidos = 0;
  
  completedBlocks.forEach((block, i) => {
    md += `## ${block.title}\n`;
    md += `**Itens Concluídos:** ${block.items.length}\n\n`;
    
    block.items.forEach((item, idx) => {
      totalConcluidos++;
      const executionText = item.execution_count && item.execution_count > 1 
        ? ` (${item.execution_count}x)` 
        : '';
      
      md += `### ✓ ${item.title}${executionText}\n`;
      
      if (item.description) {
        md += `**Descrição:** ${item.description}\n\n`;
      }
      
      if (item.last_analyst) {
        md += `**Último Analista:** ${item.last_analyst}\n\n`;
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
        md += `**✅ Última Execução:** ${dataFormatada}\n\n`;
      } else {
        md += `**✅ Status:** Concluído\n\n`;
      }
      
      // Adicionar histórico se houver múltiplas execuções
      if (item.execution_history && item.execution_history.length > 1) {
        md += `**📊 Histórico de Execuções:**\n`;
        item.execution_history.forEach((hist, histIdx) => {
          const histDataFormatada = hist.completed_at 
            ? new Date(hist.completed_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Data não informada';
          md += `- ${histIdx + 1}ª execução: ${hist.analyst_name || 'Analista não informado'} em ${histDataFormatada}\n`;
        });
        md += `\n`;
      }
      
      md += `---\n\n`;
    });
  });

  md += `## 📊 RESUMO EXECUTIVO\n\n`;
  md += `- **Total de Itens Concluídos:** ${totalConcluidos}\n`;
  md += `- **Blocos com Atividades Finalizadas:** ${completedBlocks.length}\n`;
  md += `- **Taxa de Progresso:** Blocos com pelo menos um item concluído\n\n`;

  console.log('📝 Markdown final gerado (primeiros 500 chars):', md.substring(0, 500));
  console.log('👤 Nome do cliente no markdown final:', md.includes(clientName));
  console.log('📊 Total de caracteres no markdown:', md.length);

  return md;
}

// Nova rota no servidor Express para PDF de itens concluídos
app.post('/checklist-completed-pdf', async (req, res) => {
  console.log('📥 Recebida requisição para PDF de itens concluídos');
  console.log('📊 Body completo recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    const { blocks, clientName, markdown } = req.body;

    console.log('🔍 Parâmetros extraídos:');
    console.log('  - blocks:', typeof blocks, Array.isArray(blocks) ? blocks.length : 'N/A');
    console.log('  - clientName:', typeof clientName, clientName);
    console.log('  - markdown:', typeof markdown, markdown ? markdown.length : 'N/A');

    if (!blocks || !Array.isArray(blocks)) {
      console.log('❌ Validação falhou: blocks inválido');
      return res.status(400).json({ 
        error: "Blocos do checklist são obrigatórios",
        received: typeof blocks
      });
    }

    if (!clientName || typeof clientName !== 'string') {
      console.log('❌ Validação falhou: clientName inválido');
      return res.status(400).json({ 
        error: "Nome do cliente é obrigatório",
        received: typeof clientName
      });
    }

    // Filtrar apenas blocos com pelo menos um item concluído
    const completedBlocks = filtrarBlocosComAlgumConcluido(blocks);
    console.log('📊 Blocos filtrados:', completedBlocks.length);

    if (completedBlocks.length === 0) {
      console.log('❌ Nenhum item concluído encontrado');
      return res.status(400).json({
        error: "Nenhum item concluído para gerar o PDF."
      });
    }

    console.log('✅ Processando PDF de itens concluídos...');
    console.log('👤 Cliente:', clientName);
    console.log('📊 Blocos com itens concluídos:', completedBlocks.length);

    // Gerar markdown apenas com os blocos e itens concluídos
    const finalMarkdown = generateCompletedChecklistMarkdown(completedBlocks, clientName);
    console.log('📝 Markdown gerado (primeiros 300 chars):', finalMarkdown.substring(0, 300));
    console.log('👤 Nome do cliente no markdown:', finalMarkdown.includes(clientName));
    
    // Gerar HTML específico para itens concluídos
    const htmlContent = gerarHtmlChecklistConcluidos(finalMarkdown, clientName);
    console.log('🌐 HTML gerado (primeiros 500 chars):', htmlContent.substring(0, 500));
    console.log('👤 Nome do cliente no HTML:', htmlContent.includes(clientName));

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

// Nova rota para análise express com histórico
app.post('/analise-express-com-historico', async (req, res) => {
  try {
    const { 
      images, 
      analysisType, 
      clientName, 
      ocrTexts = [], 
      historicoAnterior = null,
      ultimaAnalise = null 
    } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }

    if (!analysisType || analysisType !== "express") {
      return res.status(400).json({ error: "Tipo de análise deve ser 'express'" });
    }

    console.log('📊 Iniciando análise express com histórico');
    console.log('👤 Cliente:', clientName);
    console.log('📈 Histórico anterior disponível:', !!historicoAnterior);
    console.log('🔄 Última análise disponível:', !!ultimaAnalise);

    // Construir prompt base com histórico se disponível
    let promptBase = EXPRESS_ACCOUNT_ANALYSIS;
    
    if (historicoAnterior && ultimaAnalise) {
      promptBase += `\n\n📚 HISTÓRICO ANTERIOR - NÃO REPETIR AÇÕES JÁ EXECUTADAS\n\n`;
      promptBase += `**Última análise realizada em:** ${new Date(ultimaAnalise.created_at).toLocaleDateString('pt-BR')}\n`;
      promptBase += `**Ações já executadas na semana anterior:**\n`;
      
      // Extrair ações já executadas do histórico
      const acoesExecutadas = extrairAcoesExecutadas(ultimaAnalise);
      acoesExecutadas.forEach((acao, index) => {
        promptBase += `${index + 1}. ${acao}\n`;
      });
      
      promptBase += `\n⚠️ **INSTRUÇÃO CRÍTICA:** NÃO repetir nenhuma das ações acima. Gerar NOVAS ações baseadas na evolução dos dados atuais.\n`;
      promptBase += `**Foco:** Analisar mudanças nos KPIs e propor ações complementares ou corretivas.\n\n`;
    }

    const reforco = "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    
    const promptFinal = `${promptBase}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

    const imageMessages = images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${img}` },
    }));

    let markdownFinal = await gerarAnaliseComIA(
      promptFinal,
      imageMessages,
      analysisType,
      ocrTexts
    );

    // Adicionar metadados de histórico
    const analiseComHistorico = {
      analysis: markdownFinal,
      analysisType,
      clientName: clientName || "Cliente",
      timestamp: new Date().toISOString(),
      historicoConsiderado: !!historicoAnterior,
      acoesAnteriores: historicoAnterior ? extrairAcoesExecutadas(ultimaAnalise) : [],
      evolucaoKpis: historicoAnterior ? calcularEvolucaoKpis(historicoAnterior, markdownFinal) : null
    };

    res.json(analiseComHistorico);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Erro interno do servidor",
      details: "Falha na geração da análise express com histórico",
    });
  }
});

// Função para extrair ações executadas do histórico
function extrairAcoesExecutadas(ultimaAnalise) {
  try {
    const acoes = [];
    
    // Procurar por seções de ações no markdown
    const acoesMatch = ultimaAnalise.content.match(/📋 PLANO TÁTICO[\s\S]*?(?=\n##|\n###|$)/gi);
    
    if (acoesMatch) {
      const acoesTexto = acoesMatch[0];
      
      // Extrair ações específicas (linhas que começam com ✅)
      const acoesLinhas = acoesTexto.match(/✅\s*([^\n]+)/g);
      
      if (acoesLinhas) {
        acoesLinhas.forEach(acao => {
          const acaoLimpa = acao.replace(/✅\s*/, '').trim();
          if (acaoLimpa) {
            acoes.push(acaoLimpa);
          }
        });
      }
    }
    
    return acoes.slice(0, 10); // Limitar a 10 ações para não sobrecarregar o prompt
  } catch (error) {
    console.warn('Erro ao extrair ações executadas:', error);
    return [];
  }
}

// Função para calcular evolução dos KPIs
function calcularEvolucaoKpis(historicoAnterior, analiseAtual) {
  try {
    const evolucao = {
      visitantes: null,
      conversao: null,
      gmv: null,
      roas: null,
      ticketMedio: null
    };
    
    // Extrair KPIs da análise anterior
    const kpisAnterior = extrairKpisDoTexto(historicoAnterior.content);
    const kpisAtual = extrairKpisDoTexto(analiseAtual);
    
    // Calcular variações
    if (kpisAnterior.visitantes && kpisAtual.visitantes) {
      evolucao.visitantes = {
        anterior: kpisAnterior.visitantes,
        atual: kpisAtual.visitantes,
        variacao: ((kpisAtual.visitantes - kpisAnterior.visitantes) / kpisAnterior.visitantes * 100).toFixed(1)
      };
    }
    
    if (kpisAnterior.conversao && kpisAtual.conversao) {
      evolucao.conversao = {
        anterior: kpisAnterior.conversao,
        atual: kpisAtual.conversao,
        variacao: ((kpisAtual.conversao - kpisAnterior.conversao) / kpisAnterior.conversao * 100).toFixed(1)
      };
    }
    
    if (kpisAnterior.gmv && kpisAtual.gmv) {
      evolucao.gmv = {
        anterior: kpisAnterior.gmv,
        atual: kpisAtual.gmv,
        variacao: ((kpisAtual.gmv - kpisAnterior.gmv) / kpisAnterior.gmv * 100).toFixed(1)
      };
    }
    
    return evolucao;
  } catch (error) {
    console.warn('Erro ao calcular evolução dos KPIs:', error);
    return null;
  }
}

// Função para extrair KPIs do texto
function extrairKpisDoTexto(texto) {
  const kpis = {
    visitantes: null,
    conversao: null,
    gmv: null,
    roas: null,
    ticketMedio: null
  };
  
  try {
    // Extrair visitantes
    const visitantesMatch = texto.match(/Visitantes:?\s*([\d,]+)/i);
    if (visitantesMatch) {
      kpis.visitantes = parseInt(visitantesMatch[1].replace(/,/g, ''));
    }
    
    // Extrair conversão
    const conversaoMatch = texto.match(/Taxa de Conversão:?\s*([\d,]+)%/i);
    if (conversaoMatch) {
      kpis.conversao = parseFloat(conversaoMatch[1].replace(',', '.'));
    }
    
    // Extrair GMV
    const gmvMatch = texto.match(/GMV Mês:?\s*R\$\s*([\d.,]+)/i);
    if (gmvMatch) {
      kpis.gmv = parseFloat(gmvMatch[1].replace(/\./g, '').replace(',', '.'));
    }
    
    // Extrair ROAS
    const roasMatch = texto.match(/ROAS:?\s*([\d,]+)/i);
    if (roasMatch) {
      kpis.roas = parseFloat(roasMatch[1].replace(',', '.'));
    }
    
    // Extrair ticket médio
    const ticketMatch = texto.match(/Ticket Médio:?\s*R\$\s*([\d.,]+)/i);
    if (ticketMatch) {
      kpis.ticketMedio = parseFloat(ticketMatch[1].replace(/\./g, '').replace(',', '.'));
    }
    
  } catch (error) {
    console.warn('Erro ao extrair KPIs:', error);
  }
  
  return kpis;
}  
  //whatsapp-express.js
const whatsappExpressRouter = require('./whatsapp-express');
app.use('/api', whatsappExpressRouter);

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

// Exportar função para testes
module.exports = {
  calcularCPA
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Microserviço de análise rodando na porta ${PORT}`);
  console.log(`🧪 Teste o Browserless em: http://localhost:${PORT}/test-browserless`);
  console.log(`🧮 Teste o CPA em: http://localhost:${PORT}/test-cpa`);
  console.log(`🏪 Teste o CPA da naty_store em: http://localhost:${PORT}/test-naty-cpa`);
  console.log(`🔧 Teste o problema RCPA em: POST http://localhost:${PORT}/test-rcpa-problema`);
});