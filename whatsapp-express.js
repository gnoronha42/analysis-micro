const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const { WHATSAPP_EXPRESS_PROMPT } = require('./analysis');

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
  
  // Anexar dados reais ao prompt para a IA usar exatamente estes valores
  const dadosReaisBloco = `- Nome: ${dados.nome}
- Faturamento últimos 30 dias: R$ ${dados.faturamento30d}
- Visitantes: ${dados.visitantes} 
- Pedidos: ${dados.pedidos}
- Investimento Shopee Ads: R$ ${dados.investimentoAds}
- ROAS Mensal: ${dados.roasValido}x
- Conversão: ${dados.conversao}% (a cada 100 pessoas, ${Math.round(dados.conversao)} compram)
- Ticket Médio: R$ ${dados.ticketMedio}
- Maior desafio: ${dados.desafio}`;

  const promptFinal = `${WHATSAPP_EXPRESS_PROMPT}\n\n${dadosReaisBloco}`;

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
  // Extrair informações específicas da análise da IA se possível
  let gargaloIA = dadosProcessados.gargalo;
  let dinheiroMesaIA = dadosProcessados.dinheiro_na_mesa;
  
  // Tentar extrair informações mais específicas da análise da IA
  if (analiseIA && analiseIA.includes('Gargalo Principal')) {
    const gargaloMatch = analiseIA.match(/Gargalo Principal[:\s]*([^•\n]+)/i);
    if (gargaloMatch && gargaloMatch[1]) {
      gargaloIA = gargaloMatch[1].trim().replace(/[•\-]/g, '').trim();
    }
  }
  
  if (analiseIA && analiseIA.includes('Dinheiro na Mesa')) {
    const dinheiroMatch = analiseIA.match(/R\$\s*([\d.,]+)/);
    if (dinheiroMatch && dinheiroMatch[1]) {
      dinheiroMesaIA = dinheiroMatch[1];
    }
  }

  const mensagem = `
🚀 *ANÁLISE EXPRESS EFEITO VENDAS* 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 Olá *${dadosProcessados.nome}*!

Sua análise personalizada está pronta! 📊

📈 *VISÃO GERAL (30 DIAS)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Faturamento:* R$ ${dadosProcessados.faturamento_30d}
📦 *Pedidos:* ${dadosProcessados.pedidos}
👥 *Visitantes:* ${dadosProcessados.visitantes}
💸 *Investimento Ads:* R$ ${dadosProcessados.invest_ads_mensal}

🎯 *MÉTRICAS PRINCIPAIS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *ROAS Informado:* ${dadosProcessados.roas_mensal}x
📈 *ROAS Calculado:* ${dadosProcessados.roas_calculado}x [${dadosProcessados.selo_roas}]
🔄 *Taxa Conversão:* ${dadosProcessados.conversao}% [${dadosProcessados.selo_conversao}]
💵 *Ticket Médio:* R$ ${dadosProcessados.ticket_medio}
🎯 *CPA:* R$ ${dadosProcessados.cpa_geral}
⚡ *Score Gargalo:* ${dadosProcessados.score_gargalo}/100

🔍 *DIAGNÓSTICO PRINCIPAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 *Gargalo Identificado:* ${gargaloIA}
🎯 *Relacionado ao seu desafio:* "${dadosProcessados.maior_desafio}"

💎 *DINHEIRO NA MESA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Você pode estar deixando de capturar:
*R$ ${dinheiroMesaIA}* este mês! 🤯

📊 *PROJEÇÕES 30 DIAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 *Conservador:* ${dadosProcessados.pedidos} pedidos | R$ ${dadosProcessados.faturamento_30d}
🟡 *Realista:* ${dadosProcessados.pedidos_realista} pedidos (+${dadosProcessados.delta_pedidos_realista}) | R$ ${dadosProcessados.gmv_realista}
🟠 *Otimista:* ${dadosProcessados.pedidos_otimista} pedidos (+${dadosProcessados.delta_pedidos_otimista}) | R$ ${dadosProcessados.gmv_otimista}

🔒 *O QUE VOCÊ NÃO ESTÁ VENDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 Top 5 SKUs por potencial (CTR, CPC, ROAS)
🔐 Mapa de Funil por SKU detalhado
🔐 Projeções semanais & metas por campanha
🔐 Priorização de verba automática

⚡ *POR QUE ASSINAR AGORA?*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Dossiê prático, pronto para decisão
✅ Atualizado todo mês automaticamente
✅ Foco em margem e escalabilidade
✅ Se já está na meta, próximo passo é *ESCALA COM CONTROLE*

🎯 *PRÓXIMOS PASSOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 *Assinar Relatório Completo Efeito Vendas*
📊 *Ver Amostra de 1 SKU*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *Responda esta mensagem para saber mais!*
🚀 *EFEITO VENDAS - Especialistas em Shopee*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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

function formatarMarkdownParaWhatsApp(texto, ctx = {}) {
  if (!texto || typeof texto !== 'string') return '';
  let t = texto.replace(/\r\n/g, '\n');

  // Limpeza básica de markdown
  t = t.replace(/\*\*(.*?)\*\*/g, '*$1*'); // **bold** -> *bold*
  t = t.replace(/`([^`]+)`/g, '$1'); // remover crases
  t = t.replace(/^---+$/gm, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'); // separadores
  t = t.replace(/^\s*[-•]\s+/gm, '• '); // bullets

  // Cabeçalhos com mapeamento de emojis e separadores
  const headerMap = (titleRaw) => {
    const title = titleRaw.trim().toUpperCase();
    if (title.includes('DIAGNÓSTICO')) return `🩺 DIAGNÓSTICO SIMPLES E VISUAL\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    if (title.includes('IMPACTO')) return `💸 IMPACTO FINANCEIRO TRADUZIDO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    if (title.includes('RISCOS')) return `⚠️ RISCOS REAIS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    if (title.includes('PROJEÇÃO')) return `📈 PROJEÇÃO MOTIVADORA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    if (title.includes('CALL TO ACTION') || title.includes('CALL TO ACTION IMPACTANTE')) return `🎯 CALL TO ACTION IMPACTANTE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    return `🔷 ${titleRaw.trim()}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  };
  t = t.replace(/^###\s+(.*)$/gmi, (_, g1) => headerMap(g1));
  t = t.replace(/^##\s+(.*)$/gmi, (_, g1) => headerMap(g1));
  t = t.replace(/^#\s+(.*)$/gmi, (_, g1) => headerMap(g1));

  // Emojis para métricas principais
  t = t.replace(/^\s*CONVERSÃO\s*:/gmi, '📊 Conversão:');
  t = t.replace(/^\s*TICKET\s*M[ÉE]DIO\s*:/gmi, '💵 Ticket médio:');
  t = t.replace(/^\s*ROAS\s*:/gmi, '🚀 ROAS:');

  // Emojis para perdas/impactos
  t = t.replace(/^\s*PERDA\s+POR\s+CONVERS[ÃA]O\s+BAIXA\s*:/gmi, '⚠️ Perda por conversão baixa:');
  t = t.replace(/^\s*PERDA\s+POR\s+TICKET\s+M[ÉE]DIO\s+BAIXO\s*:/gmi, '⚠️ Perda por ticket médio baixo:');
  t = t.replace(/^\s*PERDA\s+POR\s+FALTA\s+DE\s+ESCALA\s+EM\s+ADS\s*:/gmi, '⚠️ Perda por falta de escala em Ads:');
  t = t.replace(/^\s*SOMA\s+FINAL\s*:/gmi, '💰 Total em jogo:');

  // Frases entre aspas -> itálico
  t = t.replace(/(^|\n)\s*"([^"]+)"\s*(?=\n|$)/g, (_, p1, p2) => `${p1}_${p2}_`);

  // Normalizações
  t = t.replace(/[\t ]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.trim();

  // Cabeçalho personalizado
  const nome = ctx.nome ? `\n👤 ${ctx.nome}` : '';
  const header = `🚀 *EFEITO VENDAS – Análise Express*${nome}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  return `${header}${t}`;
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
 const mensagemLimpa = mensagemFinal.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '').trim();

    
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

function formatarPadraoWhatsApp(texto, nome) {
  if (!texto || typeof texto !== 'string') return '';
  let t = texto;


  t = t.replace(/^.*AN[ÁA]LISE EXPRESS.*$/m, ''); // Remove qualquer header duplicado
  const header = `📊 ANÁLISE EXPRESS – ${nome || 'Cliente'}\n`;

  // Blocos principais
  t = t.replace(/(^|\n)##?\s*DIAGN[ÓO]STICO SIMPLES E VISUAL/gi, '\n📊 Diagnóstico Simples e Visual');
  t = t.replace(/(^|\n)##?\s*IMPACTO FINANCEIRO TRADUZIDO/gi, '\n💰 Impacto Financeiro Traduzido');
  t = t.replace(/(^|\n)##?\s*RISCOS REAIS/gi, '\n⚠️ Riscos Reais');
  t = t.replace(/(^|\n)##?\s*PROJE[ÇC][ÃA]O( REALISTA)?( E PROBLEMAS IDENTIFICADOS)?/gi, '\n📈 Projeção Realista e Problemas Identificados');
  t = t.replace(/(^|\n)##?\s*FERRAMENTA QUE PODE TE AJUDAR/gi, '\n💡 Ferramenta que Pode te Ajudar');
  t = t.replace(/(^|\n)##?\s*O PR[ÓO]XIMO N[ÍI]VEL DA SUA LOJA/gi, '\n🚀 O Próximo Nível da Sua Loja');
  t = t.replace(/(^|\n)##?\s*INTELIG[ÊE]NCIA SEMANAL( – SELLERIA)?/gi, '\n🎯 Inteligência Semanal – SellerIA');


  t = t.replace(/([\n\r]+)([A-Za-zÀ-ÿ\s,\-]+analisando seus dados com nossa metodologia[\s\S]+?travando o crescimento da sua loja\.)/i, '\n💡 $2');

  t = t.replace(/(É como se sua loja estivesse aberta[\s\S]+?comprar nada\.)/i, '💥 $1');
  t = t.replace(/(É como se sua loja ficasse fechada[\s\S]+?semana\.)/i, '💥 $1');

  t = t.replace(/(^|\n)[\-=_]{3,}(\n|$)/g, '\n⸻\n'); // markdown ou outros separadores
  t = t.replace(/\n{3,}/g, '\n\n'); // Limitar múltiplas quebras de linha

  // Bullets para listas
  t = t.replace(/(^|\n)[\-\*]\s+/g, '\n• '); // - ou * no início de linha
  t = t.replace(/(^|\n)\d+\.\s+/g, '\n• '); // 1. 2. etc

  // Negrito para métrica principal
  t = t.replace(/\*\*(.*?)\*\*/g, '*$1*'); // **bold** -> *bold*

  // Remover markdown headers
  t = t.replace(/(^|\n)#+\s*/g, '\n');

  // Limpar espaços extras
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.trim();

  // Link final
  t = t.replace(/(https?:\/\/\S+)/g, '🔗 $1');

  // Garante que bullets e blocos estejam sempre em nova linha
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/(• )/g, '\n• ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/^[ \t]+/gm, '');

  // Adicionar cabeçalho personalizado no topo
  if (!t.startsWith('📊 ANÁLISE EXPRESS')) {
    t = header + '\n' + t;
  }

  return t;
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
    
    // NÃO formatar markdown para WhatsApp, usar texto puro da IA
    const analise = formatarPadraoWhatsApp(analiseIA, nome);
    console.log('📝 Mensagem final (primeiros 300 chars):', analise.substring(0, 300));
    
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
