const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permite payloads grandes

// Seções obrigatórias para Shopee Ads
const secoesAds = [
  "VISÃO GERAL DO DESEMPENHO – ADS",
  "ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS",
  "AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS",
  "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA",
  "RESUMO TÉCNICO",
  "CONCLUSÃO FINAL – PLANO RECOMENDADO",
];

// Placeholders do template que não podem aparecer no resultado final
const valoresExemplo = [
  "R$1.500,00", "R$3.000,00", "R$5.000,00", "R$15.000,00", "R$30.000,00", "R$50.000,00",
  "10,00", "0,00", "0%", "Produto Principal", "XX", "XXX", "X,XX", "X%", "R$X,XX", "R$XX,XX", "R$XX.XXX,XX"
];

// Função para detectar se uma seção já existe (tolerante a emojis, #, espaços)
function contemSecao(markdown, secao) {
  const cleanSecao = secao.replace(/[^\w\s]/gi, "").replace(/\s+/g, " ").trim();
  const regex = new RegExp(`#*\\s*[📊🔍🔎📦📈]*\\s*${cleanSecao}`, "i");
  return regex.test(markdown.replace(/[^\w\s#]/gi, ""));
}

// Adiciona seção faltante (sempre sem emoji para facilitar deduplicação)
function adicionarSecaoFaltante(markdown, secao, analysisType) {
  if (analysisType === "ads") {
    switch (secao) {
      case "VISÃO GERAL DO DESEMPENHO – ADS":
        return `# VISÃO GERAL DO DESEMPENHO – ADS

- **Total de Campanhas Ativas:** Dado não informado
- **Campanhas Pausadas:** Dado não informado  
- **Tipo de Segmentação Predominante:** Dado não informado
- **Investimento Diário Médio por Campanha:** Dado não informado
- **CPA Médio Geral:** Dado não informado 🧮  
- **Anúncios escaláveis no momento:** Dado não informado
📉 **Diagnóstico geral do funil:** Dado não informado

${markdown}`;
      case "ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS":
        return (
          markdown +
          `

# ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS

**Produto: Dado não informado**  
**Status:** Dado não informado  
**Investimento:** Dado não informado  
**GMV:** Dado não informado  
**CTR:** Dado não informado  
**Cliques:** Dado não informado  
**Pedidos Pagos:** Dado não informado  
**Conversão:** Dado não informado  
**ROAS:** Dado não informado  
**CPA:** Dado não informado  

✅ **Diagnóstico Técnico e detalhado do Analista:**  
> Dado não informado

✅ **Sugestão Técnica e detalhada do Analista:**  
> Dado não informado`
        );
      case "AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS":
        return (
          markdown +
          `

# AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

| Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |
|------|---------|------|-------|----------------|----------|
| Dado não informado | Dado não informado | Dado não informado | Dado não informado | Dado não informado | Dado não informado |`
        );
      case "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA":
        return (
          markdown +
          `

## PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA

### 30 pedidos/dia (900/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

### 60 pedidos/dia (1800/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

### 100 pedidos/dia (3000/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

⚠️ **Importante:** Essas projeções assumem estabilidade no CPA atual.`
        );
      case "RESUMO TÉCNICO":
        return (
          markdown +
          `

## RESUMO TÉCNICO

| Indicador | Valor Atual |
|-----------|-------------|
| Investimento total em Ads | Dado não informado |
| Pedidos via Ads | Dado não informado |
| GMV via Ads | Dado não informado |
| ROAS médio | Dado não informado |
| CPA via Ads | Dado não informado |
| CPA geral (org + Ads) | Dado não informado |
| Projeção 30 pedidos/dia | Dado não informado |
| Projeção 60 pedidos/dia | Dado não informado |
| Projeção 100 pedidos/dia | Dado não informado |`
        );
      case "CONCLUSÃO FINAL – PLANO RECOMENDADO":
        return (
          markdown +
          `

## CONCLUSÃO FINAL – PLANO RECOMENDADO

Dado não informado.`
        );
    }
  }
  return markdown;
}

// Valida se todas as seções obrigatórias estão presentes
function validarSecoesObrigatorias(markdown, analysisType) {
  if (analysisType === "ads") {
    for (const secao of secoesAds) {
      if (!contemSecao(markdown, secao)) {
        markdown = adicionarSecaoFaltante(markdown, secao, analysisType);
      }
    }
  }
  return markdown;
}

// Remove valores de exemplo do template
function removerValoresExemplo(markdown) {
  for (const valor of valoresExemplo) {
    const regex = new RegExp(valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    markdown = markdown.replace(regex, "Dado não informado");
  }
  return markdown;
}

// Limpa concatenações como "R$3.50Dado não informado"
function limparConcatenacoes(markdown) {
  return markdown.replace(/([R\$0-9\.,]+)Dado não informado/g, (m, p1) =>
    p1.trim()
  );
}

// Reorganiza as seções na ordem correta e remove duplicatas
function reorganizarSecoesAds(markdown) {
  let novoMarkdown = "";
  for (const secao of secoesAds) {
    // Regex tolerante a emojis, #, espaços
    const regex = new RegExp(
      `#*\\s*[📊🔍🔎📦📈]*\\s*${secao}[\\s\\S]*?(?=\\n#+\\s*[📊🔍🔎📦📈]*\\s*|$)`,
      "i"
    );
    const match = markdown.match(regex);
    if (match) {
      novoMarkdown += match[0].trim() + "\n\n";
    } else {
      novoMarkdown += adicionarSecaoFaltante("", secao, "ads").trim() + "\n\n";
    }
  }
  return novoMarkdown.trim();
}

// Força o RESUMO TÉCNICO como tabela
function forcarResumoTecnicoComoTabela(markdown) {
  const resumoRegex = /## RESUMO TÉCNICO[\s\S]*?(?=\n# |\n## |$)/;
  const match = markdown.match(resumoRegex);
  if (!match) return markdown;
  let bloco = match[0];
  if (bloco.includes("| Indicador |") && bloco.includes("| Valor Atual |"))
    return markdown;
  const indicadores = [
    "Investimento total em Ads",
    "Pedidos via Ads",
    "GMV via Ads",
    "ROAS médio",
    "CPA via Ads",
    "CPA geral (org + Ads)",
    "Projeção 30 pedidos/dia",
    "Projeção 60 pedidos/dia",
    "Projeção 100 pedidos/dia",
  ];
  let tabela = "\n| Indicador | Valor Atual |\n|-----------|-------------|\n";
  for (const ind of indicadores) {
    const regex = new RegExp(`${ind}[^\n\r|]*([^\n\r|]*)`, "i");
    const val = bloco.match(regex)?.[1]?.trim() || "Dado não informado";
    tabela += `| ${ind} | ${val || "Dado não informado"} |\n`;
  }
  const novoBloco = "## RESUMO TÉCNICO\n" + tabela + "\n";
  return markdown.replace(resumoRegex, novoBloco);
}

// 1. Remova todas as seções obrigatórias do markdown
function removerSecoesObrigatorias(markdown, secoes) {
  for (const secao of secoes) {
    // Regex tolerante a emojis, #, espaços
    const regex = new RegExp(
      `#*\\s*[📊🔍🔎📦📈]*\\s*${secao}[\\s\\S]*?(?=\\n#+\\s*[📊🔍🔎📦📈]*\\s*|$)`,
      "gi"
    );
    markdown = markdown.replace(regex, "");
  }
  return markdown.trim();
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
        model: "gpt-4-turbo-preview",
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
            Authorization: `Bearer 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`,
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

// Função para extrair métricas essenciais das análises
function extrairMetricasChave(analysisContent) {
  const metricas = {
    visitantes: null,
    pedidos: null,
    gmv: null,
    roas: null,
    conversao: null,
    ticketMedio: null,
    investimento: null
  };

  // Regex patterns para extrair métricas
  const patterns = {
    visitantes: /visitantes?\s*:\s*([0-9\.,]+)/i,
    pedidos: /pedidos?\s*(?:pagos?)?\s*:\s*([0-9\.,]+)/i,
    gmv: /gmv\s*(?:pago?)?\s*:\s*r\$?\s*([0-9\.,]+)/i,
    roas: /roas\s*:\s*([0-9\.,]+)/i,
    conversao: /conversão\s*:\s*([0-9\.,]+)%?/i,
    ticketMedio: /ticket\s*médio\s*:\s*r\$?\s*([0-9\.,]+)/i,
    investimento: /investimento\s*(?:em\s*ads?)?\s*:\s*r\$?\s*([0-9\.,]+)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = analysisContent.match(pattern);
    if (match) {
      metricas[key] = match[1];
    }
  }

  return metricas;
}

// Endpoint principal
app.post('/analise', async (req, res) => {
  try {
    const { images, analysisType, clientName, ocrTexts = [] } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }
    if (!analysisType || !["ads", "account", "express"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    // Montagem do prompt
    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    
    let basePrompt;
    
    if (analysisType === "ads") {
      basePrompt = `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;
    } else if (analysisType === "account") {
      basePrompt = `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;
    } else if (analysisType === "express") {
      basePrompt = `${EXPRESS_ACCOUNT_ANALYSIS}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;
    }

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

    // Exemplo de uso das funções utilitárias:
    // markdownFinal = removerValoresExemplo(markdownFinal);
    // markdownFinal = limparConcatenacoes(markdownFinal);
    // markdownFinal = reorganizarSecoesAds(markdownFinal);
    // markdownFinal = forcarResumoTecnicoComoTabela(markdownFinal);

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

// Modificar a rota /comparison para usar métricas resumidas:
app.post('/comparison', async (req, res) => {
  try {
    const { prompt, clientName, analysisType, period, totalAnalyses } = req.body;
    
    console.log('🔍 Recebida solicitação de comparação');
    console.log(`📊 Cliente: ${clientName}`);
    console.log(`📈 Tipo: ${analysisType}`);
    console.log(`📅 Período: ${period}`);
    console.log(`🔢 Total de análises: ${totalAnalyses}`);

    if (!prompt) {
      console.error('❌ Prompt não fornecido');
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    // EXTRAIR APENAS AS MÉTRICAS das análises ao invés do texto completo
    const analysisData = JSON.parse(prompt.match(/ANÁLISES PARA COMPARAÇÃO:\s*\{ANALYSES_DATA\}([\s\S]*?)PERÍODO ANALISADO:/)?.[1] || '[]');
    
    // Versão resumida do prompt
    const resumedPrompt = `
🧠 CONSULTOR SÊNIOR SHOPEE - ANÁLISE COMPARATIVA RESUMIDA

Analise a evolução das métricas entre ${totalAnalyses} análises do cliente ${clientName}.

TIPO: ${analysisType}
PERÍODO: ${period}

DADOS RESUMIDOS DAS ANÁLISES:
${analysisData.map((analysis, index) => {
  const metricas = extrairMetricasChave(analysis.content || '');
  return `
ANÁLISE ${index + 1} (${analysis.created_at}):
- Visitantes: ${metricas.visitantes || 'N/D'}
- Pedidos: ${metricas.pedidos || 'N/D'}
- GMV: R$ ${metricas.gmv || 'N/D'}
- ROAS: ${metricas.roas || 'N/D'}
- Conversão: ${metricas.conversao || 'N/D'}%
- Ticket Médio: R$ ${metricas.ticketMedio || 'N/D'}
- Investimento: R$ ${metricas.investimento || 'N/D'}
`;
}).join('\n---\n')}

Gere um relatório comparativo focando em:
1. **Evolução das métricas** - quais melhoraram/pioraram
2. **Tendências identificadas** - padrões ao longo do tempo
3. **Insights principais** - 3-5 pontos mais importantes
4. **Recomendações estratégicas** - ações baseadas na evolução
5. **Próximos passos** - prioridades para o próximo período

Mantenha o relatório objetivo e acionável.
`;

    console.log('🤖 Enviando versão resumida para OpenAI...');
    console.log(`📏 Tamanho do prompt: ${resumedPrompt.length} caracteres`);

    const requestBody = {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Você é um consultor sênior especializado em análise comparativa de performance para Shopee. Sempre responda em português brasileiro com insights detalhados e acionáveis."
        },
        {
          role: "user", 
          content: resumedPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    };

    console.log('📤 Enviando request para OpenAI...');

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
      console.error('❌ Erro da OpenAI:', errorData);
      return res.status(500).json({ 
        error: 'Erro na API da OpenAI',
        details: errorData.error?.message || "Erro desconhecido"
      });
    }

    const data = await response.json();
    console.log('✅ Resposta da OpenAI recebida');
    
    const comparison = data.choices?.[0]?.message?.content || "";
    
    if (!comparison.trim()) {
      console.error('❌ Resposta vazia da OpenAI');
      return res.status(500).json({ 
        error: 'Resposta vazia da OpenAI',
        details: 'A IA não conseguiu gerar a análise comparativa'
      });
    }
    
    console.log('✅ Análise comparativa gerada com sucesso');
    console.log(`📝 Tamanho da resposta: ${comparison.length} caracteres`);
    
    res.json({ 
      comparison: comparison,
      metadata: {
        clientName,
        analysisType,
        period,
        totalAnalyses,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar análise comparativa:', error);
    res.status(500).json({ 
      error: 'Erro ao processar análise comparativa',
      details: error.message 
    });
  }
});

// Inicie o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Microserviço de análise rodando na porta ${PORT}`);
});
