const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT } = require('./analysis');
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
        model: "gpt-4.1", // Troquei para modelo de imagem
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

// Endpoint principal
app.post('/analise', async (req, res) => {
  try {
    const { images, analysisType, clientName, ocrTexts = [] } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }
    if (!analysisType || !["ads", "account"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    // Montagem do prompt (adicione seu prompt aqui)
    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    const basePrompt =
      analysisType === "ads"
        ? `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
        : `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

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
    markdownFinal = removerValoresExemplo(markdownFinal);
    markdownFinal = limparConcatenacoes(markdownFinal);
    markdownFinal = reorganizarSecoesAds(markdownFinal);
    markdownFinal = forcarResumoTecnicoComoTabela(markdownFinal);

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

// Inicie o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Microserviço de análise rodando na porta ${PORT}`);
});
