const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const { EXPRESS_ACCOUNT_ANALYSIS, WHATSAPP_EXPRESS_PROMPT } = require('./analysis');

// Prompt completo fornecido pelo usuário
const PROMPT_COMPLETO_E1 = `
Você é um analista sênior da SellerIA, especialista em Shopee com 8 anos de experiência e responsável por mais de R$ 50 milhões em GMV otimizado.

DADOS RECEBIDOS:
- Nome: [NOME]
- Faturamento últimos 30 dias: [VALOR_FATURADO]
- Visitantes: [VISITANTES]
- Pedidos: [PEDIDOS]
- Investimento Shopee Ads: [INVESTIMENTO_ADS]
- ROAS Mensal: [ROAS]
- Maior desafio: [DESAFIO]

MISSÃO: Entregar uma análise TÉCNICA e VALIOSA que demonstre expertise, crie urgência através de riscos reais e mostre o potencial de crescimento.

## ESTRUTURA OBRIGATÓRIA:

### 📊 DIAGNÓSTICO TÉCNICO
Calcule e apresente:
- Taxa de conversão: (Pedidos ÷ Visitantes × 100)
- Ticket médio: (Faturamento ÷ Pedidos)
- Status ROAS vs benchmark 8x
- Eficiência geral da conta

**FRASE IMPACTO:** "[NOME], analisando seus dados com nossa metodologia de 47 métricas, identifiquei [X] gargalos críticos que estão limitando seu crescimento."

### 💰 POTENCIAL PERDIDO
Calcule e mostre:

🔴 **Receita perdida por conversão baixa:** R$ [VALOR]/mês
🔴 **Oportunidade de escala em ads:** R$ [VALOR]/mês  
🔴 **Potencial de ticket médio:** R$ [VALOR]/mês

**💸 TOTAL PERDIDO: R$ [MIN] a R$ [MAX] por mês**

### ⚠️ RISCOS IMINENTES (Crie urgência)
Identifique 2-3 riscos específicos e urgentes:

**"[NOME], baseado em +2.000 contas analisadas, vejo riscos críticos:"**
- "Risco 1: [PROBLEMA ESPECÍFICO] pode custar R$ [VALOR] nos próximos 30 dias"
- "Risco 2: [TENDÊNCIA NEGATIVA] indica perda de [X]% de market share"
- "Risco 3: [INEFICIÊNCIA] está queimando R$ [VALOR] por semana"

### 📈 PROJEÇÃO DE CRESCIMENTO
Mostre o potencial se otimizar:

**"Se implementadas as otimizações identificadas:"**
- **30 dias:** Faturamento de R$ [ATUAL] para R$ [PROJETADO] (+[X]%)
- **60 dias:** Conversão de [X]% para [X]% (benchmark do setor)
- **90 dias:** ROAS otimizado para [X]x com volume [X]% maior

**"ROI das otimizações: Cada R$ 1 investido gera R$ [X] em receita adicional."**

### 🎯 INSIGHTS DE EXPERTISE
Demonstre conhecimento técnico específico:

**"Baseado na minha experiência com +2000 contas Shopee:"**
- "Contas com seu perfil ([CARACTERÍSTICA]) têm potencial de crescer [X]x em [TEMPO]"
- "O padrão [MÉTRICA] vs [MÉTRICA] indica [INSIGHT TÉCNICO]"
- "Seu [DESAFIO] é comum em [X]% das contas, mas [SOLUÇÃO ESTRATÉGICA]"

### 🔍 LIMITAÇÃO DESTA ANÁLISE

**"Esta análise express revelou apenas 15% do potencial da sua conta."**

**"O que eu NÃO consegui analisar hoje:"**
• Comportamento semanal das campanhas (qual dia/hora converte mais)
• Análise produto por produto (quais estão canibalizando vendas)
• Flutuações do algoritmo (última atualização afetou sua conta?)
• Oportunidades de otimização em tempo real
• Benchmarking com contas similares do nosso banco de dados

**"Resultado: Você está tomando decisões estratégicas com dados incompletos."**

### 🎯 SOLUÇÃO: INTELIGÊNCIA ESTRATÉGICA SEMANAL

**"Para contas com seu potencial, recomendo o Plano E1 - Inteligência Estratégica."**

**"O que você receberia TODA SEMANA:"**
✅ Análise completa de + de 47 métricas da sua loja com nossa IA
✅ Diagnóstico prático com sugestões aplicáveis  
✅ Identificação de gargalos e oportunidades em tempo real
✅ Direcionamento estratégico para melhorar performance
✅ Relatório mensal de fechamento com visão estratégica

**"Diferença: Dados atualizados semanalmente = decisões precisas = crescimento consistente."**

### 💎 OPORTUNIDADE QUALIFICADA

**"Baseado no potencial da sua conta, você se qualifica para o Plano E1."**

**"Condição especial (próximas 48h):"**
- Valor normal: R$ 1.297/mês
- Para você: R$ 497/mês (62% OFF)
- Ideal para quem já vende e quer tomar decisões com base em dados

**"Acesse: https://consultoriaefeitovendas.com.br/seller-ia/"**

**"⏰ Esta condição para você expira em 48h ou quando atingirmos o limite de vagas."**

---

**TOM:** Técnico, autoritativo, urgente. Mostre que você SABE do que está falando e que há riscos reais em não agir.
`;

// Template WhatsApp completo
const TEMPLATE_WHATSAPP_COMPLETO = `
🔍 *ANÁLISE EXPRESS - [NOME]*

📊 *Diagnóstico Técnico:*
• Conversão: [CONVERSAO]% (benchmark: 1,2%)
• Ticket médio: R$ [TICKET_MEDIO]
• ROAS: [ROAS_CALCULADO]x (benchmark: 8x+)
• Status geral: [STATUS_GERAL]

💡 *[NOME], analisando seus dados com nossa metodologia de 47 métricas, identifiquei [GARGALOS_COUNT] gargalos críticos que estão limitando seu crescimento.*

---

💰 *Potencial Perdido:*

🔴 *Receita perdida (conversão):* R$ [RECEITA_PERDIDA_CONVERSAO]/mês
🔴 *Oportunidade de escala em ads:* R$ [OPORTUNIDADE_ADS]/mês  
🔴 *Potencial de ticket médio:* R$ [POTENCIAL_TICKET]/mês

💸 *TOTAL PERDIDO: R$ [TOTAL_PERDIDO_MIN] a R$ [TOTAL_PERDIDO_MAX] por mês*

---

⚠️ *RISCOS IMINENTES:*

*[NOME], baseado em +2.000 contas analisadas, vejo riscos críticos:*

• *Risco 1:* [RISCO_1]
• *Risco 2:* [RISCO_2]
• *Risco 3:* [RISCO_3]

---

📈 *PROJEÇÃO DE CRESCIMENTO:*

*Se implementadas as otimizações identificadas:*

• *30 dias:* Faturamento de R$ [FATURAMENTO_ATUAL] para R$ [FATURAMENTO_30D] (+[CRESCIMENTO_30D]%)
• *60 dias:* Conversão de [CONVERSAO_ATUAL]% para [CONVERSAO_60D]% (benchmark do setor)
• *90 dias:* ROAS otimizado para [ROAS_90D]x com volume [VOLUME_90D]% maior

*ROI das otimizações: Cada R$ 1 investido gera R$ [ROI_OTIMIZACAO] em receita adicional.*

---

🎯 *INSIGHTS DE EXPERTISE:*

*Baseado na minha experiência com +2000 contas Shopee:*

• *Contas com seu perfil têm potencial de crescer [CRESCIMENTO_PERFIL]x em [TEMPO_CRESCIMENTO]*
• *O padrão [PADRAO_IDENTIFICADO] indica [INSIGHT_TECNICO]*
• *Seu [DESAFIO] é comum, mas [SOLUCAO_ESTRATEGICA]*

---

🔍 *LIMITAÇÃO DESTA ANÁLISE:*

*Esta análise express revelou apenas 15% do potencial da sua conta.*

*O que eu NÃO consegui analisar hoje:*
• Comportamento semanal das campanhas
• Análise produto por produto  
• Flutuações do algoritmo da Shopee
• Oportunidades de otimização em tempo real
• Benchmarking com contas similares

*Resultado: Você está tomando decisões estratégicas com dados incompletos.*

---

🎯 *SOLUÇÃO: INTELIGÊNCIA ESTRATÉGICA SEMANAL*

*Para contas com seu potencial, recomendo o Plano E1 - Inteligência Estratégica.*

*O que você receberia TODA SEMANA:*
✅ Análise completa de + de 47 métricas da sua loja com nossa IA
✅ Diagnóstico prático com sugestões aplicáveis  
✅ Identificação de gargalos e oportunidades em tempo real
✅ Direcionamento estratégico para melhorar performance
✅ Relatório mensal de fechamento com visão estratégica

*Diferença: Dados atualizados semanalmente = decisões precisas = crescimento consistente.*

---

💎 *OPORTUNIDADE QUALIFICADA:*

*Baseado no potencial da sua conta, você se qualifica para o Plano E1.*

*Condição especial (próximas 48h):*
• Valor normal: R$ 1.297/mês
• Para você: R$ 497/mês (62% OFF)
• Ideal para quem já vende e quer tomar decisões com base em dados

*Acesse: https://consultoriaefeitovendas.com.br/seller-ia/*

⏰ *Esta condição expira em 48h ou quando atingirmos o limite de vagas.*
`;

// Função para processar dados e substituir placeholders
function processarDadosParaPrompt(dados) {
  console.log('📊 Processando dados para o prompt:', JSON.stringify(dados, null, 2));
  
  // Converter strings para números
  const faturamento_30d = parseFloat(dados.faturamento30d?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const visitantes = parseInt(dados.visitantes?.replace(/[^\d]/g, '')) || 0;
  const pedidos = parseInt(dados.pedidos?.replace(/[^\d]/g, '')) || 0;
  const invest_ads_mensal = parseFloat(dados.investimentoAds?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const roas_mensal = parseFloat(dados.roasMensal?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  
  console.log('🔢 Valores convertidos:', {
    faturamento_30d,
    visitantes,
    pedidos,
    invest_ads_mensal,
    roas_mensal
  });

  // Cálculos conforme o prompt
  const conversao = visitantes > 0 ? ((pedidos / visitantes) * 100).toFixed(2) : '—';
  const ticket_medio = pedidos > 0 ? (faturamento_30d / pedidos).toFixed(2) : '—';
  const cpa_geral = pedidos > 0 ? (invest_ads_mensal / pedidos).toFixed(2) : '—';
  const roas_calculado = invest_ads_mensal > 0 ? (faturamento_30d / invest_ads_mensal).toFixed(2) : '—';
  
  // Normalizações
  const conv_norm = Math.min(100, Math.max(0, (parseFloat(conversao) / 3) * 100));
  const roas_norm = Math.min(100, Math.max(0, (parseFloat(roas_calculado) / 12) * 100));
  const trafego_norm = Math.min(100, Math.max(0, (visitantes / 10000) * 100));
  
  // Score de gargalo
  const score_gargalo = Math.round(0.4 * conv_norm + 0.4 * roas_norm + 0.2 * trafego_norm);
  
  // Dinheiro na mesa
  let dinheiro_na_mesa = 0;
  if (ticket_medio !== '—' && visitantes > 0) {
    const gmv_pot_conv2 = visitantes * 0.02 * parseFloat(ticket_medio);
    const gmv_pot_roas8 = invest_ads_mensal * 8;
    const potencial_bruto = Math.max(gmv_pot_conv2, gmv_pot_roas8);
    dinheiro_na_mesa = Math.max(0, potencial_bruto - faturamento_30d);
  }
  
  // Diagnóstico do gargalo
  let gargalo = 'Eficiência (custo vs valor)';
  if (parseFloat(conversao) < 1.5) {
    gargalo = 'Página/Oferta';
  } else if (parseFloat(roas_calculado) < 8 || (parseFloat(cpa_geral) >= 0.35 * parseFloat(ticket_medio))) {
    gargalo = 'Eficiência (custo vs valor)';
  } else if (visitantes < 2000 && parseFloat(conversao) >= 1.5) {
    gargalo = 'Tráfego';
  }
  
  // Selos
  const selo_roas = parseFloat(roas_calculado) < 8 ? 'Abaixo da meta (8x)' : 
                   parseFloat(roas_calculado) <= 12 ? 'Na meta' : 'Acima da meta';
  const selo_conversao = parseFloat(conversao) < 1.5 ? 'Baixa' :
                        parseFloat(conversao) < 2 ? 'Atenção' :
                        parseFloat(conversao) < 3 ? 'Intermediária' : 'Boa';
  const selo_trafego = visitantes < 2000 ? 'Baixo' :
                      visitantes <= 5000 ? 'Ok' : 'Alto';

  // Calcular projeções (30 dias)
  let pedidos_realista = pedidos;
  let gmv_realista = faturamento_30d;
  let pedidos_otimista = pedidos;
  let gmv_otimista = faturamento_30d;
  
  if (ticket_medio !== '—' && visitantes > 0) {
    // Realista: +10% tráfego, +0,3% conversão
    const visitas_realista = Math.round(visitantes * 1.10);
    const conv_realista = Math.min(100, parseFloat(conversao) + 0.3);
    pedidos_realista = Math.round(visitas_realista * (conv_realista / 100));
    gmv_realista = pedidos_realista * parseFloat(ticket_medio);
    
    // Otimista: +20% tráfego, +0,6% conversão
    const visitas_otimista = Math.round(visitantes * 1.20);
    const conv_otimista = Math.min(100, parseFloat(conversao) + 0.6);
    pedidos_otimista = Math.round(visitas_otimista * (conv_otimista / 100));
    gmv_otimista = pedidos_otimista * parseFloat(ticket_medio);
  }

  console.log('📈 Métricas calculadas:', {
    conversao,
    ticket_medio,
    cpa_geral,
    roas_calculado,
    score_gargalo,
    dinheiro_na_mesa: dinheiro_na_mesa.toFixed(2),
    gargalo,
    selo_roas,
    selo_conversao,
    selo_trafego,
    pedidos_realista,
    pedidos_otimista
  });

  return {
    nome: dados.nome || 'Cliente',
    faturamento_30d: faturamento_30d.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
    visitantes: visitantes.toLocaleString('pt-BR'),
    pedidos: pedidos.toString(),
    invest_ads_mensal: invest_ads_mensal.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
    roas_mensal: roas_mensal.toFixed(2).replace('.', ','),
    maior_desafio: dados.desafio || 'Não informado',
    conversao,
    ticket_medio,
    cpa_geral,
    roas_calculado,
    score_gargalo,
    dinheiro_na_mesa: dinheiro_na_mesa.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
    gargalo,
    selo_roas,
    selo_conversao,
    selo_trafego,
    // Projeções
    pedidos_realista: pedidos_realista.toString(),
    gmv_realista: gmv_realista.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
    delta_pedidos_realista: (pedidos_realista - pedidos).toString(),
    pedidos_otimista: pedidos_otimista.toString(),
    gmv_otimista: gmv_otimista.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
    delta_pedidos_otimista: (pedidos_otimista - pedidos).toString()
  };
}

// Função utilitária para chamada à OpenAI
async function gerarMensagemExpressOpenAI(dados) {
  console.log('🤖 Iniciando geração de análise com IA...');
  
  // Processar dados e substituir placeholders
  const dadosProcessados = processarDadosParaPrompt(dados);
  
  // Substituir placeholders no prompt completo E1
  let promptFinal = PROMPT_COMPLETO_E1
    .replace(/\[NOME\]/g, dadosProcessados.nome)
    .replace(/\[VALOR_FATURADO\]/g, `R$ ${dadosProcessados.faturamento_30d}`)
    .replace(/\[VISITANTES\]/g, dadosProcessados.visitantes)
    .replace(/\[PEDIDOS\]/g, dadosProcessados.pedidos)
    .replace(/\[INVESTIMENTO_ADS\]/g, `R$ ${dadosProcessados.invest_ads_mensal}`)
    .replace(/\[ROAS\]/g, dadosProcessados.roas_mensal)
    .replace(/\[DESAFIO\]/g, dadosProcessados.maior_desafio);

  console.log('📝 Prompt final preparado (primeiros 500 chars):', promptFinal.substring(0, 500));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `Você é um consultor sênior de Shopee Ads do EFEITO VENDAS. 

INSTRUÇÕES ESPECÍFICAS:
1. Use EXATAMENTE os dados fornecidos - NUNCA invente valores
2. Gere apenas a "SAÍDA 2 - MINI-RELATÓRIO" do prompt
3. Faça TODOS os cálculos conforme as regras definidas no prompt
4. Use os selos e classificações exatas conforme o prompt
5. Seja técnico, objetivo e focado em conversão para assinatura
6. NÃO gere as mensagens de WhatsApp, apenas o mini-relatório

IMPORTANTE: Execute todos os cálculos matemáticos conforme especificado no prompt antes de gerar o relatório.` 
        },
        { role: "user", content: promptFinal },
      ],
      max_tokens: 2500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ Erro da OpenAI:', errorData);
    throw new Error(`Erro ao gerar análise com OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`);
  }
  
  const data = await response.json();
  console.log('✅ Análise gerada com sucesso');
  return data.choices?.[0]?.message?.content || "Análise não gerada.";
}

// Função para validar e formatar número de telefone
function formatarNumeroTelefone(numero) {
  // Remove todos os caracteres não numéricos
  const numeroLimpo = numero.replace(/\D/g, '');
  
  // Se não começar com 55, adiciona (código do Brasil)
  if (!numeroLimpo.startsWith('55')) {
    return '55' + numeroLimpo;
  }
  
  return numeroLimpo;
}

// Função para formatar mensagem bonita para WhatsApp baseada na análise da IA
function formatarMensagemWhatsAppComAnalise(dadosProcessados, analiseIA) {
  console.log('📝 Formatando mensagem WhatsApp com template completo...');
  
  // Extrair informações da análise da IA
  let gargalosCount = '3';
  let statusGeral = 'POTENCIAL DE CRESCIMENTO IDENTIFICADO';
  let receitaPerdidaConversao = '0';
  let oportunidadeAds = '0';
  let potencialTicket = '0';
  let totalPerdidoMin = '0';
  let totalPerdidoMax = '0';
  let risco1 = 'Conversão abaixo do benchmark pode impactar resultados';
  let risco2 = 'Oportunidades de otimização não exploradas';
  let risco3 = 'Concorrência pode ganhar market share';
  let crescimento30d = '25';
  let conversao60d = '2,0';
  let roas90d = '10';
  let volume90d = '30';
  let roiOtimizacao = '3,5';
  let crescimentoPerfil = '2-3';
  let tempoCrescimento = '90 dias';
  let padraoIdentificado = `ROAS ${dadosProcessados.roas_calculado}x + Conversão ${dadosProcessados.conversao}%`;
  let insightTecnico = 'potencial de otimização significativo';
  let solucaoEstrategica = 'foco em conversão e eficiência de ads';

  // Tentar extrair dados específicos da análise da IA
  if (analiseIA) {
    // Extrair potencial perdido
    const receitaMatch = analiseIA.match(/Receita perdida.*?R\$\s*([\d.,]+)/i);
    if (receitaMatch) receitaPerdidaConversao = receitaMatch[1];
    
    const oportunidadeMatch = analiseIA.match(/Oportunidade de escala.*?R\$\s*([\d.,]+)/i);
    if (oportunidadeMatch) oportunidadeAds = oportunidadeMatch[1];
    
    const ticketMatch = analiseIA.match(/Potencial de ticket.*?R\$\s*([\d.,]+)/i);
    if (ticketMatch) potencialTicket = ticketMatch[1];
    
    const totalMatch = analiseIA.match(/TOTAL PERDIDO.*?R\$\s*([\d.,]+).*?R\$\s*([\d.,]+)/i);
    if (totalMatch) {
      totalPerdidoMin = totalMatch[1];
      totalPerdidoMax = totalMatch[2];
    }
    
    // Extrair riscos
    const risco1Match = analiseIA.match(/Risco 1:([^•\n]+)/i);
    if (risco1Match) risco1 = risco1Match[1].trim();
    
    const risco2Match = analiseIA.match(/Risco 2:([^•\n]+)/i);
    if (risco2Match) risco2 = risco2Match[1].trim();
    
    const risco3Match = analiseIA.match(/Risco 3:([^•\n]+)/i);
    if (risco3Match) risco3 = risco3Match[1].trim();
  }

  // Usar o template completo com substituições
  let mensagem = TEMPLATE_WHATSAPP_COMPLETO
    .replace(/\[NOME\]/g, dadosProcessados.nome)
    .replace(/\[CONVERSAO\]/g, dadosProcessados.conversao)
    .replace(/\[TICKET_MEDIO\]/g, dadosProcessados.ticket_medio)
    .replace(/\[ROAS_CALCULADO\]/g, dadosProcessados.roas_calculado)
    .replace(/\[STATUS_GERAL\]/g, statusGeral)
    .replace(/\[GARGALOS_COUNT\]/g, gargalosCount)
    .replace(/\[RECEITA_PERDIDA_CONVERSAO\]/g, receitaPerdidaConversao)
    .replace(/\[OPORTUNIDADE_ADS\]/g, oportunidadeAds)
    .replace(/\[POTENCIAL_TICKET\]/g, potencialTicket)
    .replace(/\[TOTAL_PERDIDO_MIN\]/g, totalPerdidoMin)
    .replace(/\[TOTAL_PERDIDO_MAX\]/g, totalPerdidoMax)
    .replace(/\[RISCO_1\]/g, risco1)
    .replace(/\[RISCO_2\]/g, risco2)
    .replace(/\[RISCO_3\]/g, risco3)
    .replace(/\[FATURAMENTO_ATUAL\]/g, dadosProcessados.faturamento_30d)
    .replace(/\[FATURAMENTO_30D\]/g, dadosProcessados.gmv_realista)
    .replace(/\[CRESCIMENTO_30D\]/g, crescimento30d)
    .replace(/\[CONVERSAO_ATUAL\]/g, dadosProcessados.conversao)
    .replace(/\[CONVERSAO_60D\]/g, conversao60d)
    .replace(/\[ROAS_90D\]/g, roas90d)
    .replace(/\[VOLUME_90D\]/g, volume90d)
    .replace(/\[ROI_OTIMIZACAO\]/g, roiOtimizacao)
    .replace(/\[CRESCIMENTO_PERFIL\]/g, crescimentoPerfil)
    .replace(/\[TEMPO_CRESCIMENTO\]/g, tempoCrescimento)
    .replace(/\[PADRAO_IDENTIFICADO\]/g, padraoIdentificado)
    .replace(/\[INSIGHT_TECNICO\]/g, insightTecnico)
    .replace(/\[DESAFIO\]/g, dadosProcessados.maior_desafio)
    .replace(/\[SOLUCAO_ESTRATEGICA\]/g, solucaoEstrategica);

  console.log('✅ Mensagem WhatsApp formatada com template completo');
  return mensagem.trim();
}

// Função para truncar mensagem se necessário
function truncarMensagem(mensagem, maxLength = 4000) {
  if (mensagem.length <= maxLength) {
    return mensagem;
  }
  
  // Trunca e adiciona indicação de continuação
  const truncated = mensagem.substring(0, maxLength - 200);
  return truncated + '\n\n...\n\n📞 *Continue a conversa conosco para receber a análise completa!*\n🚀 *EFEITO VENDAS*';
}

// Função para enviar mensagem de texto via BotConversa
async function enviarMensagemParaWhatsapp(numero, mensagem, nome = '') {
  console.log('📱 Iniciando envio de mensagem para WhatsApp...');
  
  // Formatar número de telefone
  const numeroFormatado = formatarNumeroTelefone(numero);
  console.log('📞 Número original:', numero);
  console.log('📞 Número formatado:', numeroFormatado);
  console.log('👤 Nome:', nome);
  
  // Validar mensagem
  if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length === 0) {
    throw new Error('Mensagem inválida ou vazia');
  }
  
  // Truncar mensagem se necessário
  const mensagemFinal = truncarMensagem(mensagem);
  console.log('📝 Tamanho da mensagem original:', mensagem.length, 'caracteres');
  console.log('📝 Tamanho da mensagem final:', mensagemFinal.length, 'caracteres');

  const BOTCONVERSA_TOKEN = process.env.BOTCONVERSA_TOKEN;
  
  if (!BOTCONVERSA_TOKEN) {
    throw new Error('BOTCONVERSA_TOKEN não configurado nas variáveis de ambiente');
  }
  
  const [first_name, ...rest] = (nome || '').split(' ');
  const last_name = rest.join(' ') || 'Cliente';

  try {
  // 1. Cadastrar subscriber
    console.log('👤 Cadastrando subscriber...');
    
    const subscriberPayload = {
      phone: numeroFormatado,
      first_name: first_name || 'Cliente',
      last_name: last_name
    };
    
    console.log('📤 Payload do subscriber:', JSON.stringify(subscriberPayload, null, 2));
    
    const subscriberRes = await fetch('https://backend.botconversa.com.br/api/v1/webhook/subscriber/', {
      method: 'POST',
      headers: {
        'API-KEY': BOTCONVERSA_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriberPayload)
    });

    if (!subscriberRes.ok) {
      const errorText = await subscriberRes.text();
      console.error('❌ Erro ao criar subscriber:', errorText);
      console.error('❌ Status do subscriber:', subscriberRes.status);
      throw new Error(`Erro ao criar subscriber: ${errorText}`);
    }
    
    const subscriberData = await subscriberRes.json();
    console.log('✅ Resposta do subscriber:', JSON.stringify(subscriberData, null, 2));
    
    const subscriberId = subscriberData.id;
    if (!subscriberId) {
      console.error('❌ ID do subscriber não retornado:', subscriberData);
      throw new Error('ID do subscriber não foi retornado pela API');
    }
    
    console.log('✅ Subscriber criado com ID:', subscriberId);

    // 2. Enviar mensagem de texto
    console.log('💬 Enviando mensagem de texto...');
    
    // Limpar mensagem de caracteres problemáticos
    const mensagemLimpa = mensagemFinal
      .replace(/[^\w\s\-.,!?@#$%&*()+=\[\]{};:'"<>\/\\|`~áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/g, '') // Remove caracteres especiais
      .trim();
    
    console.log('📝 Mensagem original (100 chars):', mensagemFinal.substring(0, 100));
    console.log('📝 Mensagem limpa (100 chars):', mensagemLimpa.substring(0, 100));
    
    // Primeiro tentar com mensagem de teste simples
    const mensagemTeste = 'Olá! Esta é uma mensagem de teste.';
    
    // Formato correto baseado na documentação da API
    const messagePayload = {
      type: 'text',
      value: mensagemLimpa
    };
    
    console.log('📤 Payload correto da mensagem:', JSON.stringify(messagePayload, null, 2));
    
    const messageRes = await fetch(`https://backend.botconversa.com.br/api/v1/webhook/subscriber/${subscriberId}/send_message/`, {
      method: 'POST',
      headers: {
        'API-KEY': BOTCONVERSA_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });

  if (!messageRes.ok) {
    const errorText = await messageRes.text();
      console.error('❌ Erro ao enviar mensagem:', errorText);
      console.error('❌ Status:', messageRes.status);
      console.error('❌ Headers:', Object.fromEntries(messageRes.headers.entries()));
      throw new Error(`Erro ao enviar mensagem: ${errorText}`);
  }
  
    const messageData = await messageRes.json();
    console.log('✅ Mensagem enviada com sucesso!');
    console.log('✅ Resposta da API:', JSON.stringify(messageData, null, 2));
    return messageData;

  } catch (error) {
    console.error('❌ Erro no processo de envio:', error);
    throw error;
  }
}

router.post('/whatsapp-express', async (req, res) => {
  try {
    console.log('🚀 Iniciando processamento da análise express...');
    console.log('📊 Dados recebidos:', JSON.stringify(req.body, null, 2));

    const { nome, email, telefone, faturamento30d, visitantes, pedidos, investimentoAds, roasMensal, desafio } = req.body;
    
    // Validações
    if (!telefone) {
      console.log('❌ Telefone não fornecido');
      return res.status(400).json({ error: "Telefone é obrigatório para envio ao WhatsApp." });
    }
    
    if (!nome || !faturamento30d || !visitantes || !pedidos || !investimentoAds || !roasMensal || !desafio) {
      console.log('❌ Dados obrigatórios faltando');
      return res.status(400).json({ error: "Todos os campos são obrigatórios: nome, faturamento30d, visitantes, pedidos, investimentoAds, roasMensal, desafio." });
    }
    
    console.log('✅ Validações passaram, gerando análise com IA...');
    
    // Gerar análise usando OpenAI com o prompt completo
    const analiseIA = await gerarMensagemExpressOpenAI({ nome, email, faturamento30d, visitantes, pedidos, investimentoAds, roasMensal, desafio });
    
    console.log('🤖 Análise da IA gerada (primeiros 300 chars):', analiseIA.substring(0, 300));
    
    // Processar dados para formatação bonita do WhatsApp
    const dadosProcessados = processarDadosParaPrompt({ nome, email, faturamento30d, visitantes, pedidos, investimentoAds, roasMensal, desafio });
    
    // Formatar mensagem bonita para WhatsApp baseada na análise da IA
    const analise = formatarMensagemWhatsAppComAnalise(dadosProcessados, analiseIA);
    
    console.log('📝 Mensagem final formatada (primeiros 300 chars):', analise.substring(0, 300));
    
    // Envia a mensagem de texto para o WhatsApp
    const resultado = await enviarMensagemParaWhatsapp(telefone, analise, nome);
    
    console.log('✅ Processo concluído com sucesso!');
    return res.json({ 
      success: true, 
      mensagem: 'Análise enviada com sucesso para o WhatsApp!', 
      resultado,
      preview: analise.substring(0, 200) + '...'
    });
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return res.status(500).json({ 
      error: error.message || "Erro interno do servidor",
      details: "Falha no processamento da análise express"
    });
  }
});

module.exports = router;
