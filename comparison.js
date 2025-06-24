require('dotenv').config();
const fetch = require('node-fetch');

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

// Função para gerar prompt de comparação baseado no tipo
function gerarPromptComparacao(type, clientName, period, analyses) {
  const basePrompt = `
🧠 CONSULTOR SÊNIOR SHOPEE - ANÁLISE COMPARATIVA HISTÓRICA

Você é um analista sênior especializado em análise comparativa de performance para Shopee.
Analise a evolução entre as ${analyses.length} análises do cliente ${clientName}.

TIPO DE ANÁLISE: ${type === 'account' ? 'CONTA' : type === 'ads' ? 'ANÚNCIOS' : 'EXPRESS'}
PERÍODO ANALISADO: ${period}

ANÁLISES PARA COMPARAÇÃO:
${analyses.map((analysis, index) => {
    const metricas = extrairMetricasChave(analysis.content || '');
    return `
ANÁLISE ${index + 1} (${new Date(analysis.created_at).toLocaleDateString('pt-BR')}):
Título: ${analysis.title}
Conteúdo: ${analysis.content ? analysis.content.substring(0, 800) : 'Conteúdo não disponível'}...

MÉTRICAS EXTRAÍDAS:
- Visitantes: ${metricas.visitantes || 'N/D'}
- Pedidos: ${metricas.pedidos || 'N/D'}
- GMV: R$ ${metricas.gmv || 'N/D'}
- ROAS: ${metricas.roas || 'N/D'}
- Conversão: ${metricas.conversao || 'N/D'}%
- Ticket Médio: R$ ${metricas.ticketMedio || 'N/D'}
- Investimento: R$ ${metricas.investimento || 'N/D'}
`;
  }).join('\n---\n')}

ESTRUTURA DO RELATÓRIO COMPARATIVO:
`;

  if (type === 'express') {
    return basePrompt + `
# 📊 ANÁLISE COMPARATIVA EXPRESS - ${clientName}

## 🎯 RESUMO EXECUTIVO COMPARATIVO
Identifique as principais mudanças entre as análises do período.

## 📈 EVOLUÇÃO DAS MÉTRICAS PRINCIPAIS
### GMV e Pedidos
- Compare o crescimento/queda entre as análises
- Identifique padrões e tendências

### Performance Geral
- Taxa de conversão: evolução
- Ticket médio: variações
- Tráfego: mudanças significativas

## ⚡ DIAGNÓSTICO EVOLUTIVO
### 🟢 Melhorias Identificadas
Liste 3-5 aspectos que melhoraram consistentemente:

### 🔴 Pontos de Deterioração  
Identifique 3-5 aspectos que pioraram:

### 🟡 Estabilidade
Métricas que se mantiveram estáveis:

## 🚀 RECOMENDAÇÕES BASEADAS NA EVOLUÇÃO
### Ações Imediatas (7 dias)
- Baseadas nos padrões identificados
- Foque no que funcionou melhor

### Estratégias de Médio Prazo (30 dias)
- Correções para pontos de deterioração
- Escalabilidade dos sucessos

## 🎯 PRÓXIMOS PASSOS EVOLUTIVOS
Prioridades baseadas na análise comparativa histórica.

Seja objetivo e baseie-se apenas nos dados reais das análises fornecidas.`;

  } else if (type === 'ads') {
    return basePrompt + `
# 📊 ANÁLISE COMPARATIVA ADS - ${clientName}

## 🎯 RESUMO EXECUTIVO COMPARATIVO
Performance evolutiva das campanhas no período analisado.

## 📈 EVOLUÇÃO DAS MÉTRICAS ADS
### Investimento e Retorno
- ROAS: tendência evolutiva
- CPA: variações e otimizações
- Investimento total: crescimento/redução

### Performance de Campanhas
- CTR: melhorias/quedas
- Conversão: análise evolutiva
- GMV via Ads: crescimento

## 📦 ANÁLISE EVOLUTIVA POR PRODUTO
Compare o desempenho dos principais produtos entre as análises:

## ⚡ INSIGHTS EVOLUTIVOS
### 🟢 Campanhas em Ascensão
Identifique padrões de melhoria:

### 🔴 Campanhas em Declínio  
Produtos/campanhas com queda de performance:

### 🎯 Oportunidades Baseadas no Histórico
Estratégias que funcionaram e podem ser replicadas:

## 🚀 PLANO DE AÇÃO EVOLUTIVO
### Otimizações Imediatas
- Baseadas nos sucessos identificados
- Correções para campanhas em declínio

### Estratégia de Escalabilidade
- Como replicar os sucessos
- Novos testes baseados no histórico

## 📊 PROJEÇÕES BASEADAS NA EVOLUÇÃO
Estimativas baseadas na tendência identificada.

Foque apenas nos dados reais extraídos das análises fornecidas.`;

  } else { // account
    return basePrompt + `
# 📊 ANÁLISE COMPARATIVA CONTA - ${clientName}

## 🎯 RESUMO EXECUTIVO COMPARATIVO
Evolução geral da performance da conta no período analisado.

## 📈 EVOLUÇÃO DAS MÉTRICAS PRINCIPAIS
### Vendas e Faturamento
- GMV total: crescimento/queda
- Pedidos: evolução quantitativa
- Ticket médio: variações

### Tráfego e Conversão
- Visitantes: tendências
- Taxa de conversão: melhorias/quedas
- Fontes de tráfego: mudanças

## 📦 ANÁLISE EVOLUTIVA DE PRODUTOS
### Top Performers
Produtos que melhoraram sua posição:

### Produtos em Declínio
Produtos que perderam performance:

### Novos Lançamentos
Performance de produtos lançados no período:

## ⚡ INSIGHTS EVOLUTIVOS
### 🟢 Aspectos em Crescimento
Identifique 3-5 pontos fortes evolutivos:

### 🔴 Pontos de Atenção  
Aspectos que precisam de correção:

### 📊 Sazonalidades Identificadas
Padrões cíclicos ou sazonais observados:

## 🚀 ESTRATÉGIA EVOLUTIVA
### Otimizações Baseadas no Histórico
- Replique sucessos identificados
- Corrija padrões negativos

### Oportunidades de Crescimento
- Baseadas na análise evolutiva
- Novos mercados/produtos

## 🎯 ROADMAP DE 30 DIAS
Ações prioritárias baseadas na evolução identificada.

Mantenha o foco nos dados reais das análises fornecidas.`;
  }
}

// Função principal para processar comparação
async function processarComparacao(dadosComparacao) {
  const { 
    clientName, 
    analysisType, 
    startDate, 
    endDate, 
    analyses,
    period 
  } = dadosComparacao;

  console.log('🔍 Processando comparação de análises');
  console.log(`📊 Cliente: ${clientName}`);
  console.log(`📈 Tipo: ${analysisType}`);
  console.log(`📅 Período: ${period}`);
  console.log(`🔢 Total de análises: ${analyses.length}`);

  // Validações
  if (!clientName || !analysisType || !analyses || analyses.length < 2) {
    throw new Error('São necessários pelo menos 2 análises para comparação');
  }

  if (!["ads", "account", "express"].includes(analysisType)) {
    throw new Error(`Tipo de análise inválido: ${analysisType}`);
  }

  // Gerar prompt específico
  const comparisonPrompt = gerarPromptComparacao(analysisType, clientName, period, analyses);

  console.log('🤖 Enviando para OpenAI...');
  console.log(`📏 Tamanho do prompt: ${comparisonPrompt.length} caracteres`);

  const requestBody = {
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "Você é um consultor sênior especializado em análise comparativa de performance para Shopee. Sempre responda em português brasileiro com insights detalhados e acionáveis baseados exclusivamente nos dados fornecidos."
      },
      {
        role: "user",
        content: comparisonPrompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.3
  };

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
    throw new Error(`Erro na API da OpenAI: ${errorData.error?.message || "Erro desconhecido"}`);
  }

  const data = await response.json();
  const comparison = data.choices?.[0]?.message?.content || "";

  if (!comparison.trim()) {
    throw new Error('Resposta vazia da OpenAI');
  }

  console.log('✅ Análise comparativa gerada com sucesso');
  console.log(`📝 Tamanho da resposta: ${comparison.length} caracteres`);

  return {
    comparison: comparison,
    metadata: {
      clientName,
      analysisType,
      period,
      totalAnalyses: analyses.length,
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    }
  };
}

module.exports = {
  processarComparacao,
  extrairMetricasChave,
  gerarPromptComparacao
}; 