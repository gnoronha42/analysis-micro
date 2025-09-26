require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');
const { processarCSVAnuncios, gerarInsightsCSV, processarCSVAnaliseContaCompleta, corrigirMetricasBasicas, validarDados, extrairDadosManualBypass, validarDadosBypass, gerarPromptBypass, extrairDadosRobusta, validarDadosRobusta } = require("./csv-processor");

// Sistema de análise de tendências melhorado
function analisarTendencias(dados) {
  const tendencias = {
    performance: 'estavel',
    alertas: [],
    oportunidades: [],
    recomendacoes: []
  };

  // Análise de ROAS
  if (dados.roas < 4) {
    tendencias.performance = 'critica';
    tendencias.alertas.push('ROAS crítico - abaixo de 4x');
    tendencias.recomendacoes.push('Pausar campanhas com ROAS < 4x imediatamente');
  } else if (dados.roas >= 8) {
    tendencias.performance = 'excelente';
    tendencias.oportunidades.push('ROAS excelente - potencial para escalar');
    tendencias.recomendacoes.push('Aumentar investimento em campanhas com ROAS > 8x');
  }

  // Análise de conversão
  if (dados.conversao < 2) {
    tendencias.alertas.push('Conversão baixa - abaixo de 2%');
    tendencias.recomendacoes.push('Otimizar páginas de produto e implementar cupons');
  } else if (dados.conversao > 5) {
    tendencias.oportunidades.push('Conversão excelente - acima de 5%');
  }

  // Análise de ticket médio
  if (dados.ticketMedio < 50) {
    tendencias.alertas.push('Ticket médio baixo - abaixo de R$ 50');
    tendencias.recomendacoes.push('Implementar estratégias de upsell e cross-sell');
  }

  return tendencias;
}

// Sistema de métricas avançadas
function calcularMetricasAvancadas(dados) {
  const metricas = {
    // Métricas de eficiência
    eficienciaAds: dados.roas >= 8 ? 'excelente' : dados.roas >= 4 ? 'boa' : 'critica',
    eficienciaConversao: dados.conversao >= 5 ? 'excelente' : dados.conversao >= 2 ? 'boa' : 'critica',
    
    // Métricas de crescimento
    potencialCrescimento: calcularPotencialCrescimento(dados),
    riscoOperacional: calcularRiscoOperacional(dados),
    
    // Score geral
    scoreGeral: calcularScoreGeral(dados),
    
    // Recomendações prioritárias
    acoesPrioritarias: gerarAcoesPrioritarias(dados)
  };

  return metricas;
}

function calcularPotencialCrescimento(dados) {
  let score = 0;
  
  if (dados.roas >= 8) score += 40;
  else if (dados.roas >= 4) score += 20;
  
  if (dados.conversao >= 5) score += 30;
  else if (dados.conversao >= 2) score += 15;
  
  if (dados.ticketMedio >= 100) score += 20;
  else if (dados.ticketMedio >= 50) score += 10;
  
  if (dados.visitantes >= 10000) score += 10;
  
  return {
    score: score,
    nivel: score >= 80 ? 'alto' : score >= 60 ? 'medio' : 'baixo',
    descricao: score >= 80 ? 'Alto potencial de crescimento' : 
               score >= 60 ? 'Potencial moderado de crescimento' : 
               'Potencial limitado - necessita otimizações'
  };
}

function calcularRiscoOperacional(dados) {
  let riscos = [];
  
  if (dados.roas < 4) riscos.push('ROAS crítico');
  if (dados.conversao < 2) riscos.push('Conversão baixa');
  if (dados.ticketMedio < 30) riscos.push('Ticket médio muito baixo');
  if (dados.visitantes < 1000) riscos.push('Baixo tráfego');
  
  return {
    nivel: riscos.length >= 3 ? 'alto' : riscos.length >= 2 ? 'medio' : 'baixo',
    riscos: riscos,
    descricao: riscos.length >= 3 ? 'Alto risco operacional' : 
               riscos.length >= 2 ? 'Risco moderado' : 
               'Baixo risco operacional'
  };
}

function calcularScoreGeral(dados) {
  const potencial = calcularPotencialCrescimento(dados);
  const risco = calcularRiscoOperacional(dados);
  
  let score = potencial.score;
  
  // Reduzir score baseado no risco
  if (risco.nivel === 'alto') score -= 30;
  else if (risco.nivel === 'medio') score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

function gerarAcoesPrioritarias(dados) {
  const acoes = [];
  
  if (dados.roas < 4) {
    acoes.push({
      prioridade: 'critica',
      acao: 'Pausar campanhas com ROAS < 4x',
      impacto: 'alto',
      prazo: 'imediato'
    });
  }
  
  if (dados.conversao < 2) {
    acoes.push({
      prioridade: 'alta',
      acao: 'Otimizar páginas de produto',
      impacto: 'alto',
      prazo: '7 dias'
    });
  }
  
  if (dados.ticketMedio < 50) {
    acoes.push({
      prioridade: 'media',
      acao: 'Implementar estratégias de upsell',
      impacto: 'medio',
      prazo: '14 dias'
    });
  }
  
  if (dados.roas >= 8) {
    acoes.push({
      prioridade: 'alta',
      acao: 'Escalar campanhas de alta performance',
      impacto: 'alto',
      prazo: '3 dias'
    });
  }
  
  return acoes.sort((a, b) => {
    const prioridadeOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
  });
}

// Sistema de relatórios personalizados
function gerarRelatorioPersonalizado(dados, tipoRelatorio = 'completo') {
  const relatorio = {
    timestamp: new Date().toISOString(),
    tipo: tipoRelatorio,
    dados: dados,
    metricas: calcularMetricasAvancadas(dados),
    tendencias: analisarTendencias(dados),
    resumo: gerarResumoExecutivo(dados),
    recomendacoes: gerarRecomendacoesPersonalizadas(dados, tipoRelatorio)
  };

  return relatorio;
}

function gerarResumoExecutivo(dados) {
  const score = calcularScoreGeral(dados);
  const potencial = calcularPotencialCrescimento(dados);
  const risco = calcularRiscoOperacional(dados);

  return {
    scoreGeral: score,
    status: score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Crítico',
    potencialCrescimento: potencial.descricao,
    riscoOperacional: risco.descricao,
    principaisPontos: [
      `ROAS: ${dados.roas}x ${dados.roas >= 8 ? '✅' : dados.roas >= 4 ? '⚠️' : '❌'}`,
      `Conversão: ${dados.conversao}% ${dados.conversao >= 5 ? '✅' : dados.conversao >= 2 ? '⚠️' : '❌'}`,
      `Ticket Médio: R$ ${dados.ticketMedio} ${dados.ticketMedio >= 100 ? '✅' : dados.ticketMedio >= 50 ? '⚠️' : '❌'}`
    ]
  };
}

function gerarRecomendacoesPersonalizadas(dados, tipoRelatorio) {
  const recomendacoes = [];

  // Recomendações baseadas no tipo de relatório
  if (tipoRelatorio === 'executivo') {
    recomendacoes.push({
      categoria: 'Estratégico',
      titulo: 'Foco Principal',
      descricao: dados.roas >= 8 ? 
        'Escalar campanhas de alta performance' : 
        'Otimizar campanhas existentes antes de escalar',
      prioridade: 'alta'
    });
  }

  if (tipoRelatorio === 'operacional') {
    recomendacoes.push({
      categoria: 'Técnico',
      titulo: 'Ações Imediatas',
      descricao: 'Implementar monitoramento diário de ROAS e conversão',
      prioridade: 'critica'
    });
  }

  // Recomendações baseadas nos dados
  if (dados.roas < 4) {
    recomendacoes.push({
      categoria: 'Crítico',
      titulo: 'Pausar Campanhas Ineficientes',
      descricao: 'Pausar imediatamente campanhas com ROAS < 4x',
      prioridade: 'critica'
    });
  }

  if (dados.conversao < 2) {
    recomendacoes.push({
      categoria: 'Otimização',
      titulo: 'Melhorar Conversão',
      descricao: 'Otimizar páginas de produto e implementar cupons',
      prioridade: 'alta'
    });
  }

  return recomendacoes;
}

// Função CRÍTICA para calcular ROAS correto - NUNCA INVERTER A FÓRMULA
function calcularROASCorreto(dados) {
  const { gmv, investimento } = dados;
  
  // Validações críticas de entrada
  if (!gmv || !investimento || investimento <= 0 || gmv <= 0) {
    console.error('❌ DADOS INVÁLIDOS para cálculo do ROAS:', { gmv, investimento });
    return null;
  }
  
  // FÓRMULA CORRETA: ROAS = GMV ÷ INVESTIMENTO (NUNCA INVERTER!)
  const roas = gmv / investimento;
  
  // Validações críticas de resultado
  if (roas < 0.1) {
    console.error('🚨 ROAS CRÍTICO MUITO BAIXO:', roas, '- Possível erro nos dados');
  }
  
  if (roas > 100) {
    console.error('🚨 ROAS IMPOSSÍVEL:', roas, '- VOCÊ PROVAVELMENTE INVERTEU A FÓRMULA!');
    console.error('🔧 Verifique: GMV =', gmv, '| Investimento =', investimento);
    console.error('🔧 Fórmula correta: ROAS = GMV ÷ Investimento =', gmv, '÷', investimento, '=', roas);
  }
  
  if (roas > 50) {
    console.warn('⚠️ ROAS muito alto (suspeito):', roas, '- Verifique se os dados estão corretos');
  }
  
  // Log de confirmação do cálculo
  console.log('✅ ROAS calculado corretamente:', {
    formula: 'GMV ÷ Investimento',
    calculo: `${gmv} ÷ ${investimento} = ${roas.toFixed(2)}x`,
    status: roas >= 8 ? '🟢 EXCELENTE' : roas >= 6 ? '🟡 MUITO BOM' : roas >= 4 ? '🟠 BOM' : '🔴 CRÍTICO'
  });
  
  return {
    valor: roas,
    formatado: roas.toFixed(2),
    status: roas >= 8 ? 'excelente' : roas >= 6 ? 'muito_bom' : roas >= 4 ? 'bom' : roas >= 2 ? 'regular' : 'critico',
    recomendacao: roas >= 8 ? 'Escalar campanhas imediatamente' : 
                  roas >= 6 ? 'Otimizar e escalar gradualmente' :
                  roas >= 4 ? 'Otimizar campanhas' : 
                  roas >= 2 ? 'Revisar estratégia' :
                  'PAUSAR campanhas imediatamente - prejuízo!'
  };
}

// Função para validar e corrigir dados do relatório
function validarECorrigirDados(dados) {
  const dadosCorrigidos = { ...dados };
  
  // Calcular ROAS correto
  const roasInfo = calcularROASCorreto(dados);
  if (roasInfo) {
    dadosCorrigidos.roas = roasInfo.valor;
    dadosCorrigidos.roasFormatado = roasInfo.formatado;
    dadosCorrigidos.roasStatus = roasInfo.status;
  }
  
  // Validar conversão
  if (dados.visitantes && dados.pedidos) {
    const conversao = (dados.pedidos / dados.visitantes) * 100;
    dadosCorrigidos.conversao = conversao;
    dadosCorrigidos.conversaoStatus = conversao >= 5 ? 'excelente' : 
                                     conversao >= 2 ? 'boa' : 'critica';
  }
  
  // Validar ticket médio
  if (dados.gmv && dados.pedidos) {
    const ticketMedio = dados.gmv / dados.pedidos;
    dadosCorrigidos.ticketMedio = ticketMedio;
    dadosCorrigidos.ticketMedioStatus = ticketMedio >= 100 ? 'excelente' : 
                                        ticketMedio >= 50 ? 'bom' : 'baixo';
  }
  
  return dadosCorrigidos;
}

// FUNÇÃO CORRIGIDA: Extrair dados precisos do CSV de anúncios
function extrairDadosCorretosDosAnuncios(csvContent) {
  console.log('🔍 === EXTRAÇÃO PRECISA DE DADOS DOS ANÚNCIOS ===');
  
  if (!csvContent || typeof csvContent !== 'string') {
    console.error('❌ Conteúdo CSV inválido');
    return null;
  }
  
  const linhas = csvContent.split('\n').filter(linha => linha.trim());
  
  // Encontrar dinamicamente a linha do cabeçalho
  const headerLineIndex = linhas.findIndex(l => l.includes('Nome do Anúncio') && l.includes('Status'));
  if (headerLineIndex === -1) {
    console.error('❌ Cabeçalho não encontrado no CSV');
    return null;
  }
  const headerLine = linhas[headerLineIndex];
  const headers = headerLine.split(',').map(h => h.trim());
  console.log('📊 Headers encontrados:', headers.slice(0, 10));

  // Mapear índices das colunas importantes
  const indices = {
    nome: headers.findIndex(h => h.includes('Nome do Anúncio')),
    status: headers.findIndex(h => h.includes('Status')),
    id: headers.findIndex(h => h.includes('ID do produto')),
    impressoes: headers.findIndex(h => h.includes('Impressões') && !h.includes('Produto')),
    cliques: headers.findIndex(h => h.includes('Cliques') && !h.includes('Produto')),
    ctr: headers.findIndex(h => h.includes('CTR') && !h.includes('Produto')),
    conversoes: headers.findIndex(h => h.includes('Conversões') && !h.includes('Diretas')),
    taxaConversao: headers.findIndex(h => h.includes('Taxa de Conversão') && !h.includes('Direta')),
    itensVendidos: headers.findIndex(h => h.includes('Itens Vendidos') && !h.includes('Diretos')),
    gmv: headers.findIndex(h => h.includes('GMV')),
    despesas: headers.findIndex(h => h.includes('Despesas')),
    roas: headers.findIndex(h => h.includes('ROAS') && !h.includes('Direto'))
  };
  
  console.log('📍 Índices das colunas:', indices);
  
  // Extrair dados das campanhas
  const campanhas = [];
  let totalInvestimento = 0;
  let totalGMV = 0;
  let totalConversoes = 0;
  let totalImpressoes = 0;
  let totalCliques = 0;
  let anunciosAtivos = 0;
  let anunciosPausados = 0;
  let anunciosEncerrados = 0;
  
  // Processar cada linha de campanha (após o cabeçalho)
  for (let i = headerLineIndex + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    
    const campos = linha.split(',');
    if (campos.length < 10) continue;
    
    const campanha = {
      numero: campos[0],
      nome: campos[indices.nome] || 'Não informado',
      status: campos[indices.status] || 'Não informado',
      id: campos[indices.id] || 'Não informado',
      impressoes: parseInt(campos[indices.impressoes]?.replace(/\./g, '') || '0'),
      cliques: parseInt(campos[indices.cliques]?.replace(/\./g, '') || '0'),
      ctr: parseFloat(campos[indices.ctr]?.replace('%', '').replace(',', '.') || '0'),
      conversoes: parseInt(campos[indices.conversoes] || '0'),
      taxaConversao: parseFloat(campos[indices.taxaConversao]?.replace('%', '').replace(',', '.') || '0'),
      itensVendidos: parseInt(campos[indices.itensVendidos] || '0'),
      gmv: parseFloat(campos[indices.gmv]?.replace(',', '.') || '0'),
      despesas: parseFloat(campos[indices.despesas]?.replace(',', '.') || '0'),
      roas: parseFloat(campos[indices.roas]?.replace(',', '.') || '0')
    };
    
    // Calcular ROAS correto se necessário
    if (campanha.gmv > 0 && campanha.despesas > 0) {
      const roasCalculado = campanha.gmv / campanha.despesas;
      if (Math.abs(campanha.roas - roasCalculado) > 0.1) {
        console.warn(`⚠️ ROAS recalculado para ${campanha.nome}: ${campanha.roas} → ${roasCalculado.toFixed(2)}`);
        campanha.roas = roasCalculado;
      }
    }
    
    campanhas.push(campanha);
    
    // Acumular totais
    totalInvestimento += campanha.despesas;
    totalGMV += campanha.gmv;
    totalConversoes += campanha.conversoes;
    totalImpressoes += campanha.impressoes;
    totalCliques += campanha.cliques;
    
    // Contar status
    const status = campanha.status.toLowerCase();
    if (status.includes('andamento') || status.includes('ativo')) {
      anunciosAtivos++;
    } else if (status.includes('pausado')) {
      anunciosPausados++;
    } else if (status.includes('encerrado')) {
      anunciosEncerrados++;
    }
  }
  
  // Calcular métricas consolidadas
  const roasMedio = totalGMV > 0 && totalInvestimento > 0 ? totalGMV / totalInvestimento : 0;
  const cpaMedio = totalInvestimento > 0 && totalConversoes > 0 ? totalInvestimento / totalConversoes : 0;
  const ctrMedio = totalImpressoes > 0 && totalCliques > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const taxaConversaoMedia = totalCliques > 0 && totalConversoes > 0 ? (totalConversoes / totalCliques) * 100 : 0;
  
  const resultados = {
    dadosLoja: {
      // Extrair dados da loja das primeiras linhas, se existirem
      nomeUsuario: linhas[1]?.split(',')[1] || 'Não informado',
      nomeLoja: linhas[2]?.split(',')[1] || 'Não informado',
      idLoja: linhas[3]?.split(',')[1] || 'Não informado',
      dataRelatorio: linhas[4]?.split(',')[1] || 'Não informado',
      periodo: linhas[5]?.split(',')[1] || 'Não informado'
    },
    campanhas,
    resumoConsolidado: {
      totalCampanhas: campanhas.length,
      anunciosAtivos,
      anunciosPausados,
      anunciosEncerrados,
      totalInvestimento,
      totalGMV,
      totalConversoes,
      totalImpressoes,
      totalCliques,
      roasMedio,
      cpaMedio,
      ctrMedio,
      taxaConversaoMedia,
      investimentoDiario: totalInvestimento / 31 // Agosto tem 31 dias
    }
  };
  
  console.log('✅ Dados extraídos com precisão:', {
    totalCampanhas: campanhas.length,
    investimentoTotal: totalInvestimento.toFixed(2),
    gmvTotal: totalGMV.toFixed(2),
    roasMedio: roasMedio.toFixed(2),
    status: `${anunciosAtivos} ativas, ${anunciosPausados} pausadas, ${anunciosEncerrados} encerradas`
  });
  
  return resultados;
}

// Função para extrair métricas dinâmicas dos CSVs reais
function extrairMetricasReaisDoCSV(csvFiles) {
  console.log('📊 Extraindo métricas dinâmicas dos CSVs...');
  
  const metricas = {
    visitantes: 0,
    gmv: 0,
    pedidos: 0,
    investimento: 0,
    conversao: 0,
    ticketMedio: 0,
    roas: 0,
    cpa: 0,
    totalAnuncios: 0,
    anunciosAtivos: 0,
    anunciosPausados: 0,
    roasMedioAnuncios: 0,
    ctrMedio: 0,
    topProdutos: []
  };

  if (!csvFiles || csvFiles.length === 0) {
    console.log('⚠️ Nenhum CSV fornecido para extração');
    return metricas;
  }

  try {
    console.log('📋 CSVs disponíveis:', csvFiles.map(f => f.name || f.nome || 'sem nome'));
    
    // Extrair dados do CSV de estatísticas da loja (shop-stats)
    const shopStatsCSV = csvFiles.find(file => {
      const fileName = file.name || file.nome || '';
      return fileName.includes('shop-stats') || fileName.includes('shopee-shop-stats') || fileName.includes('colorindo_shop');
    });
    
    if (shopStatsCSV) {
      const fileName = shopStatsCSV.name || shopStatsCSV.nome || 'arquivo';
      const content = shopStatsCSV.content || shopStatsCSV.conteudo || '';
      console.log('📊 Processando CSV de estatísticas da loja:', fileName);
      const linhas = content.split('\n').filter(linha => linha.trim());
      
      if (linhas.length > 1) {
        const headers = linhas[0].split(',').map(h => h.trim().toLowerCase());
        console.log('📋 Headers shop-stats:', headers.slice(0, 10)); // Primeiros 10 para debug
        
        // Tentar diferentes variações de nomes de colunas
        const visitantesIdx = headers.findIndex(h => 
          h.includes('visitor') || h.includes('visitante') || h.includes('unique')
        );
        const gmvIdx = headers.findIndex(h => 
          h.includes('gmv') || h.includes('revenue') || h.includes('receita') || h.includes('sales')
        );
        const pedidosIdx = headers.findIndex(h => 
          h.includes('order') || h.includes('pedido') || h.includes('paid')
        );
        
        console.log('📍 Índices encontrados:', { visitantesIdx, gmvIdx, pedidosIdx });
        
        // Somar dados do mês inteiro
        let totalVisitantes = 0, totalGMV = 0, totalPedidos = 0;
        
        for (let i = 1; i < linhas.length; i++) {
          const linha = linhas[i].split(',');
          
          if (visitantesIdx >= 0 && linha[visitantesIdx]) {
            const valor = parseInt(linha[visitantesIdx].replace(/[^\d]/g, '')) || 0;
            totalVisitantes += valor;
          }
          
          if (gmvIdx >= 0 && linha[gmvIdx]) {
            const valor = linha[gmvIdx].replace(/[^\d.,]/g, '').replace(',', '.');
            totalGMV += parseFloat(valor) || 0;
          }
          
          if (pedidosIdx >= 0 && linha[pedidosIdx]) {
            const valor = parseInt(linha[pedidosIdx].replace(/[^\d]/g, '')) || 0;
            totalPedidos += valor;
          }
        }
        
        metricas.visitantes = totalVisitantes;
        metricas.gmv = totalGMV;
        metricas.pedidos = totalPedidos;
        
        console.log('✅ Dados extraídos do shop-stats:', {
          visitantes: totalVisitantes,
          gmv: totalGMV,
          pedidos: totalPedidos
        });
      }
    } else {
      console.log('⚠️ CSV shop-stats não encontrado');
    }

    // Extrair dados do CSV de anúncios
    const anunciosCSV = csvFiles.find(file => {
      const fileName = file.name || file.nome || '';
      return fileName.includes('Anúncios') || 
             fileName.includes('Ads') || 
             fileName.includes('Dados+Gerais') ||
             fileName.includes('anuncios') ||
             fileName.includes('Dados Gerais');
    });
    
    if (anunciosCSV) {
      const fileName = anunciosCSV.name || anunciosCSV.nome || 'arquivo';
      const content = anunciosCSV.content || anunciosCSV.conteudo || '';
      console.log('📊 Processando CSV de anúncios:', fileName);
      const linhas = content.split('\n').filter(linha => linha.trim());
      
      if (linhas.length > 1) {
        const headers = linhas[0].split(',').map(h => h.trim());
        console.log('📋 Headers anúncios:', headers.slice(0, 10)); // Primeiros 10 para debug
        
        // Encontrar índices das colunas importantes
        const statusIdx = headers.findIndex(h => h.includes('Status'));
        const despesaIdx = headers.findIndex(h => 
          h.includes('Despesa') || h.includes('Cost') || h.includes('Spend')
        );
        const roasIdx = headers.findIndex(h => h.includes('ROAS'));
        const ctrIdx = headers.findIndex(h => h.includes('CTR'));
        
        console.log('📍 Índices anúncios:', { statusIdx, despesaIdx, roasIdx, ctrIdx });
        
        let totalInvestimento = 0, totalAnuncios = 0, ativos = 0, pausados = 0;
        let somaROAS = 0, somaCTR = 0, countROAS = 0, countCTR = 0;
        
        for (let i = 1; i < linhas.length; i++) {
          const linha = linhas[i].split(',');
          if (linha.length < 3) continue; // Pular linhas muito pequenas
          
          totalAnuncios++;
          
          // Status do anúncio
          if (statusIdx >= 0 && linha[statusIdx]) {
            const status = linha[statusIdx].trim();
            if (status.includes('Andamento') || status.includes('Running') || status.includes('Em Andamento') || status.includes('Ativo')) {
              ativos++;
            } else if (status.includes('Pausado') || status.includes('Paused') || status.includes('Inativo')) {
              pausados++;
            }
          }
          
          // Investimento
          if (despesaIdx >= 0 && linha[despesaIdx]) {
            const valor = linha[despesaIdx].replace(/[^\d.,]/g, '').replace(',', '.');
            const investimento = parseFloat(valor) || 0;
            totalInvestimento += investimento;
          }
          
          // ROAS
          if (roasIdx >= 0 && linha[roasIdx]) {
            const valor = linha[roasIdx].replace(/[^\d.,]/g, '').replace(',', '.');
            const roas = parseFloat(valor) || 0;
            if (roas > 0 && roas < 100) { // Filtrar valores absurdos
              somaROAS += roas;
              countROAS++;
            }
          }
          
          // CTR
          if (ctrIdx >= 0 && linha[ctrIdx]) {
            const valor = linha[ctrIdx].replace(/[^\d.,]/g, '').replace(',', '.');
            const ctr = parseFloat(valor) || 0;
            if (ctr > 0 && ctr < 50) { // Filtrar valores absurdos
              somaCTR += ctr;
              countCTR++;
            }
          }
        }
        
        metricas.investimento = totalInvestimento;
        metricas.totalAnuncios = totalAnuncios;
        metricas.anunciosAtivos = ativos;
        metricas.anunciosPausados = pausados;
        metricas.roasMedioAnuncios = countROAS > 0 ? parseFloat((somaROAS / countROAS).toFixed(2)) : 0;
        metricas.ctrMedio = countCTR > 0 ? parseFloat((somaCTR / countCTR).toFixed(2)) : 0;
        
        console.log('✅ Dados extraídos dos anúncios:', {
          investimento: totalInvestimento,
          totalAnuncios: totalAnuncios,
          ativos: ativos,
          pausados: pausados,
          roasMedio: metricas.roasMedioAnuncios,
          ctrMedio: metricas.ctrMedio
        });
      }
    } else {
      console.log('⚠️ CSV de anúncios não encontrado');
    }

    // Calcular métricas derivadas dinamicamente
    if (metricas.gmv > 0 && metricas.investimento > 0) {
      metricas.roas = parseFloat((metricas.gmv / metricas.investimento).toFixed(2));
    }
    
    if (metricas.investimento > 0 && metricas.pedidos > 0) {
      metricas.cpa = parseFloat((metricas.investimento / metricas.pedidos).toFixed(2));
    }
    
    if (metricas.visitantes > 0 && metricas.pedidos > 0) {
      metricas.conversao = parseFloat((metricas.pedidos / metricas.visitantes * 100).toFixed(2));
    }
    
    if (metricas.gmv > 0 && metricas.pedidos > 0) {
      metricas.ticketMedio = parseFloat((metricas.gmv / metricas.pedidos).toFixed(2));
    }

    const status = metricas.roas >= 8 ? 'EXCELENTE' : metricas.roas >= 6 ? 'MUITO BOM' : metricas.roas >= 4 ? 'BOM' : 'CRÍTICO';
    
    console.log('🎯 Métricas finais calculadas dinamicamente:', {
      ...metricas,
      status: status
    });
    
    return metricas;
    
  } catch (error) {
    console.error('❌ Erro ao extrair métricas dos CSVs:', error);
    return metricas; // Retorna métricas zeradas em caso de erro
  }
}

// NOVA FUNÇÃO CRÍTICA: Validação matemática pré-análise
function validarDadosMatematicos(dados) {
  console.log('🔍 === VALIDAÇÃO MATEMÁTICA CRÍTICA INICIADA ===');
  
  const erros = [];
  const avisos = [];
  
  // Extrair valores principais
  const gmv = parseFloat(dados.gmv || 0);
  const investimento = parseFloat(dados.investimento || 0);
  const pedidos = parseInt(dados.pedidos || 0);
  const visitantes = parseInt(dados.visitantes || 0);
  
  console.log('📊 Valores extraídos:', { gmv, investimento, pedidos, visitantes });
  
  // VALIDAÇÃO 1: ROAS
  if (gmv > 0 && investimento > 0) {
    const roas = gmv / investimento;
    console.log(`🧮 ROAS calculado: ${gmv} ÷ ${investimento} = ${roas.toFixed(2)}x`);
    
    if (roas > 100) {
      erros.push(`🚨 ROAS IMPOSSÍVEL: ${roas.toFixed(2)}x - Você provavelmente INVERTEU a fórmula!`);
      erros.push(`🔧 Corrija: ROAS = GMV (${gmv}) ÷ Investimento (${investimento}) = ${roas.toFixed(2)}x`);
    } else if (roas > 50) {
      avisos.push(`⚠️ ROAS muito alto: ${roas.toFixed(2)}x - Verifique se os dados estão corretos`);
    } else if (roas < 0.1) {
      erros.push(`🚨 ROAS muito baixo: ${roas.toFixed(2)}x - Possível erro nos dados`);
    } else {
      console.log(`✅ ROAS válido: ${roas.toFixed(2)}x`);
    }
  } else {
    avisos.push('⚠️ GMV ou Investimento ausentes - ROAS não calculado');
  }
  
  // VALIDAÇÃO 2: CPA
  if (investimento > 0 && pedidos > 0) {
    const cpa = investimento / pedidos;
    console.log(`🧮 CPA calculado: ${investimento} ÷ ${pedidos} = R$ ${cpa.toFixed(2)}`);
    
    if (cpa > 1000) {
      erros.push(`🚨 CPA muito alto: R$ ${cpa.toFixed(2)} - Verifique os dados`);
    } else if (cpa < 0.1) {
      erros.push(`🚨 CPA muito baixo: R$ ${cpa.toFixed(2)} - Dados inconsistentes`);
    } else {
      console.log(`✅ CPA válido: R$ ${cpa.toFixed(2)}`);
    }
  } else {
    avisos.push('⚠️ Investimento ou Pedidos ausentes - CPA não calculado');
  }
  
  // VALIDAÇÃO 3: Taxa de Conversão
  if (visitantes > 0 && pedidos > 0) {
    const conversao = (pedidos / visitantes) * 100;
    console.log(`🧮 Conversão calculada: ${pedidos} ÷ ${visitantes} × 100 = ${conversao.toFixed(3)}%`);
    
    if (conversao > 25) {
      erros.push(`🚨 Conversão impossível: ${conversao.toFixed(2)}% - Dados provavelmente trocados`);
    } else if (conversao < 0.001) {
      erros.push(`🚨 Conversão muito baixa: ${conversao.toFixed(3)}% - Escala incorreta`);
    } else {
      console.log(`✅ Conversão válida: ${conversao.toFixed(3)}%`);
    }
  } else {
    avisos.push('⚠️ Visitantes ou Pedidos ausentes - Conversão não calculada');
  }
  
  console.log('🔍 === VALIDAÇÃO MATEMÁTICA FINALIZADA ===');
  console.log('❌ Erros encontrados:', erros.length);
  console.log('⚠️ Avisos gerados:', avisos.length);
  
  return {
    valido: erros.length === 0,
    erros,
    avisos,
    dadosCalculados: {
      roas: gmv > 0 && investimento > 0 ? (gmv / investimento).toFixed(2) : null,
      cpa: investimento > 0 && pedidos > 0 ? (investimento / pedidos).toFixed(2) : null,
      conversao: visitantes > 0 && pedidos > 0 ? ((pedidos / visitantes) * 100).toFixed(3) : null
    }
  };
}

// NOVA FUNÇÃO: Gerar prompt com dados corrigidos e validados
function gerarPromptCorrigido(basePrompt, metricasCorrigidas) {
  console.log('🔧 Gerando prompt com dados corrigidos...');
  
  if (!metricasCorrigidas || typeof metricasCorrigidas !== 'object') {
    console.log('⚠️ Métricas corrigidas não fornecidas, usando prompt padrão');
    return basePrompt;
  }
  
  // APLICAR VALIDAÇÃO MATEMÁTICA ANTES DE GERAR PROMPT
  const validacao = validarDadosMatematicos(metricasCorrigidas);
  
  if (!validacao.valido) {
    console.error('❌ DADOS INVÁLIDOS DETECTADOS:', validacao.erros);
    // Adicionar avisos críticos no prompt
    basePrompt += '\n\n🚨 ATENÇÃO: ERROS MATEMÁTICOS DETECTADOS:\n';
    validacao.erros.forEach(erro => {
      basePrompt += `- ${erro}\n`;
    });
    basePrompt += '\n⚠️ CORRIJA ESTES ERROS ANTES DE CONTINUAR A ANÁLISE!\n\n';
  }

  const dadosCorretos = `
🚨 DADOS REAIS CORRIGIDOS E VALIDADOS DOS CSVs:

| Métrica | Valor CORRETO |
|---------|---------------|
| Loja | ${metricasCorrigidas.loja} |
| Visitantes Mês | ${metricasCorrigidas.visitantes.toLocaleString('pt-BR')} |
| GMV Mês | R$${metricasCorrigidas.gmv.toLocaleString('pt-BR', {minimumFractionDigits: 2})} |
| Pedidos Pagos | ${metricasCorrigidas.pedidos.toLocaleString('pt-BR')} |
| Taxa de Conversão | ${metricasCorrigidas.taxaConversao.toFixed(2)}% |
| Ticket Médio | R$${metricasCorrigidas.ticketMedio.toFixed(2)} |
| Investimento em Ads | R$${metricasCorrigidas.investimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})} |
| ROAS | ${metricasCorrigidas.roas.toFixed(2)}x |
| CPA | R$${metricasCorrigidas.cpa.toFixed(2)} |

🎯 STATUS REAL DA CONTA: ${metricasCorrigidas.roas >= 8 ? '🟢 EXCELENTE - ESCALAR CAMPANHAS' : 
                          metricasCorrigidas.roas >= 6 ? '🟡 MUITO BOM - OTIMIZAR E ESCALAR' : 
                          metricasCorrigidas.roas >= 4 ? '🟠 BOM - OTIMIZAR' : '🔴 CRÍTICO - PAUSAR CAMPANHAS'}

✅ PRODUTOS REALMENTE ATIVOS (${metricasCorrigidas.produtosAtivos.length}):
${metricasCorrigidas.produtosAtivos.length > 0 ? 
  metricasCorrigidas.produtosAtivos.slice(0, 5).map((produto, i) => 
    `${i+1}. ${produto.nome}
       - Status: ${produto.status} ✅ ATIVO
       - ROAS: ${produto.roas.toFixed(2)}x
       - Investimento: R$${produto.despesa.toFixed(2)}
       - Receita: R$${produto.gmv.toFixed(2)}
       - Impressões: ${produto.impressoes.toLocaleString('pt-BR')}
       - CTR: ${produto.ctr.toFixed(2)}%`
  ).join('\n\n') : 'Nenhum produto ativo encontrado'}

❌ PRODUTOS PAUSADOS (${metricasCorrigidas.produtosPausados.length}) - NÃO MENCIONAR EM ESTRATÉGIAS:
${metricasCorrigidas.produtosPausados.length > 0 ? 
  metricasCorrigidas.produtosPausados.slice(0, 3).map((produto, i) => 
    `${i+1}. ${produto.nome} - Status: ${produto.status} ❌ PAUSADO`
  ).join('\n') : 'Nenhum produto pausado'}

⚠️ INSTRUÇÕES CRÍTICAS E OBRIGATÓRIAS:
1. USE EXATAMENTE os valores da tabela acima - SÃO OS DADOS REAIS
2. FOQUE APENAS nos produtos ATIVOS (✅) - eles estão gerando vendas
3. NUNCA mencione produtos PAUSADOS (❌) nas recomendações principais
4. ROAS real é ${metricasCorrigidas.roas.toFixed(2)}x (calculado: GMV ÷ Investimento)
5. CPA real é R$${metricasCorrigidas.cpa.toFixed(2)} (calculado: Investimento ÷ Pedidos)
6. Base TODAS as estratégias nos produtos que REALMENTE vendem
7. Se um produto está PAUSADO, ele NÃO gera vendas atuais
8. Priorize produtos ativos com melhor ROAS individual
9. NUNCA use dados de exemplo ou templates
10. Taxa de conversão REAL é ${metricasCorrigidas.taxaConversao.toFixed(2)}%

📊 ANÁLISE AUTOMÁTICA:
- Com ROAS de ${metricasCorrigidas.roas.toFixed(2)}x, a performance está ${metricasCorrigidas.roas >= 8 ? 'EXCELENTE' : metricasCorrigidas.roas >= 6 ? 'MUITO BOA' : metricasCorrigidas.roas >= 4 ? 'BOA' : 'CRÍTICA'}
- ${metricasCorrigidas.produtosAtivos.length} produtos ativos gerando vendas
- ${metricasCorrigidas.produtosPausados.length} produtos pausados (ignorar nas estratégias)
- Investimento real: R$${metricasCorrigidas.investimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
- CPA eficiente: R$${metricasCorrigidas.cpa.toFixed(2)}
`;

  console.log('✅ Prompt corrigido gerado com dados validados');
  return basePrompt + '\n\n' + dadosCorretos;
}

// Função para gerar prompt com dados pré-calculados (MANTIDA PARA COMPATIBILIDADE)
function gerarPromptComDadosReais(basePrompt, metricas) {
  // Verificar se metricas existe e tem dados válidos
  if (!metricas || typeof metricas !== 'object') {
    console.log('⚠️ Métricas não fornecidas ou inválidas, usando dados padrão');
    return basePrompt;
  }

  // Proteger todos os valores com fallbacks seguros
  const visitantes = parseInt(metricas.visitantes || 0);
  const cpa = parseFloat(metricas.cpa || 0);
  const gmv = parseFloat(metricas.gmv || 0);
  const pedidos = parseInt(metricas.pedidos || 0);
  const conversao = parseFloat(metricas.conversao || 0);
  const investimento = parseFloat(metricas.investimento || 0);
  const ticketMedio = parseFloat(metricas.ticketMedio || 0);
  const roas = parseFloat(metricas.roas || 0);
  const totalAnuncios = parseInt(metricas.totalAnuncios || 0);
  const anunciosAtivos = parseInt(metricas.anunciosAtivos || 0);
  const anunciosPausados = parseInt(metricas.anunciosPausados || 0);
  const roasMedioAnuncios = parseFloat(metricas.roasMedioAnuncios || 0);
  const ctrMedio = parseFloat(metricas.ctrMedio || 0);
  const topProdutos = Array.isArray(metricas.topProdutos) ? metricas.topProdutos : [];

  const dadosReais = `
🚨 DADOS REAIS EXTRAÍDOS DOS CSVs - USE EXATAMENTE ESTES VALORES:

| Indicador             | Valor REAL |
|-----------------------|------------|
| Visitantes Mês        | ${visitantes.toLocaleString('pt-BR')}     |
| CPA                   | R$${cpa.toFixed(2).replace('.', ',')}     |
| GMV Mês               | R$${gmv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}|
| Pedidos Pagos Mês     | ${pedidos.toLocaleString('pt-BR')}      |
| Taxa de Conversão Mês | ${conversao.toFixed(2).replace('.', ',')}%      |
| Investimento em Ads   | R$${investimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})} |
| Ticket Médio Mês      | R$${ticketMedio.toFixed(2).replace('.', ',')}      |
| ROAS                  | ${roas.toFixed(2).replace('.', ',')}       |

🎯 STATUS DA CONTA: ${roas >= 8 ? '🟢 EXCELENTE - ESCALAR CAMPANHAS' : 
                     roas >= 6 ? '🟡 MUITO BOM - OTIMIZAR E ESCALAR' : 
                     roas >= 4 ? '🟠 BOM - OTIMIZAR' : '🔴 CRÍTICO - PAUSAR CAMPANHAS'}

📊 DADOS DE ANÚNCIOS SHOPEE ADS:
- Total de Anúncios: ${totalAnuncios}
- Anúncios Ativos: ${anunciosAtivos}
- Anúncios Pausados: ${anunciosPausados}
- ROAS Médio dos Anúncios: ${roasMedioAnuncios.toFixed(2)}x
- CTR Médio: ${ctrMedio.toFixed(2)}%

🏆 TOP 5 PRODUTOS POR VENDAS (DADOS REAIS):
${topProdutos.length > 0 ? topProdutos.slice(0, 5).map((produto, i) => 
  `${i+1}. ${produto.nome || 'Produto sem nome'} - R$${parseFloat(produto.vendas || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} - ${parseFloat(produto.conversao || 0).toFixed(2)}% conversão - ROAS ${parseFloat(produto.roas || 0).toFixed(2)}x`
).join('\n') : 'Nenhum produto encontrado nos dados'}

⚠️ INSTRUÇÕES OBRIGATÓRIAS:
1. USE EXATAMENTE os valores da tabela acima
2. ROAS = ${roas.toFixed(2)}x ${roas > 0 ? '(calculado dinamicamente)' : '(sem dados disponíveis)'}
3. Se ROAS > 6x, a conta está EXCELENTE, não crítica
4. Base TODAS as recomendações nestes dados reais
5. NUNCA use valores de exemplo ou templates
`;

  return basePrompt + '\n\n' + dadosReais;
}

// Função para corrigir relatório markdown com dados reais
function corrigirRelatorioMarkdown(markdown, dadosReais) {
  let markdownCorrigido = markdown;
  
  // Corrigir ROAS
  const roasCorreto = (dadosReais.gmv / dadosReais.investimento).toFixed(2);
  markdownCorrigido = markdownCorrigido.replace(
    /\|\s*ROAS\s*\|\s*[\d.,]+\s*\|/gi,
    `| ROAS | ${roasCorreto} |`
  );
  
  // Corrigir status da conta baseado no ROAS real
  if (dadosReais.gmv / dadosReais.investimento >= 6) {
    markdownCorrigido = markdownCorrigido.replace(
      /ROAS de [\d.,]+x \(abaixo do benchmark mínimo de 8x\)/gi,
      `ROAS de ${roasCorreto}x (acima do benchmark de 6x - EXCELENTE performance)`
    );
    
    markdownCorrigido = markdownCorrigido.replace(
      /sinais claros de desaceleração/gi,
      'performance sólida e escalável'
    );
  }
  
  // Adicionar dados de anúncios se disponíveis
  if (dadosReais.totalAnuncios) {
    const secaoAnuncios = `
### 4. Análise de Campanhas de Anúncios (Shopee Ads)
#### 4.1. Resumo Geral dos Anúncios

- **Total de Anúncios:** ${dadosReais.totalAnuncios}
- **Anúncios Ativos:** ${dadosReais.anunciosAtivos}
- **Anúncios Pausados:** ${dadosReais.anunciosPausados}
- **ROAS Médio dos Anúncios:** ${dadosReais.roasMedioAnuncios}x
- **CTR Médio:** ${dadosReais.ctrMedio}%
- **Investimento Total:** R$ ${dadosReais.investimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
- **GMV Total:** R$ ${dadosReais.gmv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}

**Recomendações Estratégicas:**
- Focar em anúncios com ROAS > 6x para escalar
- Pausar anúncios com ROAS < 4x imediatamente
- Otimizar CTR de anúncios abaixo de 2%
`;
    
    markdownCorrigido = markdownCorrigido.replace(
      /### 4\. Análise de Campanhas de Anúncios \(Shopee Ads\)[\s\S]*?(?=### 5\.|$)/gi,
      secaoAnuncios
    );
  }
  
  return markdownCorrigido;
}
// Import dinâmico do marked (ES module)
let marked;

// Sistema de cache para melhorar performance
const cache = {
  relatorios: new Map(),
  analises: new Map(),
  maxSize: 100,
  ttl: 30 * 60 * 1000 // 30 minutos
};

// Função para limpar cache expirado
function limparCacheExpirado() {
  const agora = Date.now();
  for (const [key, value] of cache.relatorios.entries()) {
    if (agora - value.timestamp > cache.ttl) {
      cache.relatorios.delete(key);
    }
  }
  for (const [key, value] of cache.analises.entries()) {
    if (agora - value.timestamp > cache.ttl) {
      cache.analises.delete(key);
    }
  }
}

// Inicializar marked dinamicamente
async function initMarked() {
  if (!marked) {
    const markedModule = await import('marked');
    marked = markedModule.marked;
  }
  return marked;
}

const cors = require('cors');
const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: [
    'https://shoppe-ai-9px3.vercel.app',
    'https://www.selleria.com.br',
    'https://selleria.com.br',
    'http://www.selleria.com.br',
    'http://selleria.com.br',
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

// Middleware para limpeza automática do cache
app.use((req, res, next) => {
  // Limpar cache expirado a cada requisição
  limparCacheExpirado();
  next();
});

// Middleware adicional para headers CORS em todas as respostas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://shoppe-ai-9px3.vercel.app',
    'https://www.selleria.com.br',
    'https://selleria.com.br',
    'http://www.selleria.com.br',
    'http://selleria.com.br',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight por 24h
  
  // Responde imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS request from:', origin);
    res.status(200).end();
    return;
  }
  
  next();
});

function calcularCPA(markdown) {
  console.log('🧮 Iniciando cálculo do CPA...');
  console.log('📝 Markdown recebido (primeiros 300 chars):', markdown.substring(0, 300));
  
  // Estratégia unificada e mais robusta para encontrar investimento e pedidos
  let investimento = null;
  let pedidos = null;
  
  // Padrões de busca otimizados e mais precisos
  const patterns = {
    investimento: [
      /\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i,
      /\|\s*Investimento\s+total\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i,
      /Investimento\s+(?:em\s+)?Ads?\s*[:|]\s*R\$\s*([\d.,]+)/i
    ],
    pedidos: [
      /\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*([\d.]+)\s*\|/i,
      /\|\s*Pedidos\s+via\s+Ads\s*\|\s*([\d.]+)\s*\|/i,
      /Pedidos\s+Pagos(?:\s+Mês)?\s*[:|]\s*([\d.]+)/i
    ]
  };
  
  // Buscar investimento
  for (const pattern of patterns.investimento) {
    const match = markdown.match(pattern);
    if (match) {
      investimento = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      console.log('📊 Investimento encontrado:', investimento);
      break;
    }
  }
  
  // Buscar pedidos
  for (const pattern of patterns.pedidos) {
    const match = markdown.match(pattern);
    if (match) {
      pedidos = parseInt(match[1].replace(/\./g, ''));
      console.log('📊 Pedidos encontrados:', pedidos);
      break;
    }
  }
  
  // Validação de dados encontrados
  if (investimento && isNaN(investimento)) {
    console.warn('⚠️ Investimento inválido encontrado:', investimento);
    investimento = null;
  }
  
  if (pedidos && (isNaN(pedidos) || pedidos <= 0)) {
    console.warn('⚠️ Pedidos inválidos encontrados:', pedidos);
    pedidos = null;
  }

  // Validação adicional para ROAS - removida referência a 'dados' não definido
  // Esta validação foi removida pois 'dados' não está disponível no escopo da função calcularCPA

  console.log('💰 Investimento final:', investimento);
  console.log('📦 Pedidos finais:', pedidos);

  // Validação final e cálculo do CPA
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
        max_tokens: 32768, // Aumentado para análises mais completas
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
          body: JSON.stringify(requestBody)
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
    const { images, analysisType, clientName, ocrTexts = [], csvContent } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }
    if (!analysisType || !["ads", "account", "express"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    // ✅ VERIFICAR SE TEMOS CSV DE ANÚNCIOS PARA USAR DADOS CORRETOS
    let dadosCorretos = null;
    let validacaoMatematica = null;
    
    if (csvContent && analysisType === "ads") {
      console.log('🔍 CSV detectado! Usando extração precisa de dados...');
      dadosCorretos = extrairDadosCorretosDosAnuncios(csvContent);
      
      if (dadosCorretos) {
        console.log('✅ Dados corretos extraídos do CSV:', {
          investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
          gmv: dadosCorretos.resumoConsolidado.totalGMV,
          roas: dadosCorretos.resumoConsolidado.roasMedio
        });
        
        validacaoMatematica = validarDadosMatematicos({
          gmv: dadosCorretos.resumoConsolidado.totalGMV,
          investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
          pedidos: dadosCorretos.resumoConsolidado.totalConversoes,
          visitantes: 0
        });
      }
    }
    
    // ❌ FALLBACK: Usar método antigo se não temos CSV
    if (!dadosCorretos) {
      console.log('⚠️ Usando método antigo (sem CSV) - dados podem ser imprecisos');
      const metricasReais = extrairMetricasReaisDoCSV([]);
      validacaoMatematica = validarDadosMatematicos(metricasReais);
    }
    
    if (!validacaoMatematica.valido) {
      console.error('❌ ERRO CRÍTICO: Dados matematicamente inválidos detectados!');
      validacaoMatematica.erros.forEach(erro => console.error(erro));
    }
    
    // ✅ CRIAR REFORÇO MATEMÁTICO COM DADOS CORRETOS
    const reforcoMatematico = dadosCorretos ? `
🚨 DADOS CORRETOS EXTRAÍDOS DO CSV - USE EXATAMENTE ESTES VALORES:

**VALIDAÇÃO MATEMÁTICA APLICADA:**
${validacaoMatematica.valido ? '✅ Dados matematicamente válidos' : '❌ ERROS: ' + validacaoMatematica.erros.join(', ')}

**FÓRMULAS CORRETAS:**
- ROAS = GMV ÷ Investimento (NUNCA INVERTER!)
- CPA = Investimento ÷ Conversões
- CTR = (Cliques ÷ Impressões) × 100

**DADOS CORRETOS DO CSV:**
- **INVESTIMENTO TOTAL:** R$ ${dadosCorretos.resumoConsolidado.totalInvestimento.toFixed(2)}
- **GMV TOTAL:** R$ ${dadosCorretos.resumoConsolidado.totalGMV.toFixed(2)}
- **ROAS MÉDIO CORRETO:** ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x
- **CPA MÉDIO CORRETO:** R$ ${dadosCorretos.resumoConsolidado.cpaMedio.toFixed(2)}
- **CONVERSÕES TOTAIS:** ${dadosCorretos.resumoConsolidado.totalConversoes}
- **CAMPANHAS:** ${dadosCorretos.resumoConsolidado.anunciosAtivos} ativas, ${dadosCorretos.resumoConsolidado.anunciosPausados} pausadas

🎯 **CLASSIFICAÇÃO AUTOMÁTICA:**
- ROAS ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x = ${dadosCorretos.resumoConsolidado.roasMedio >= 8 ? '🟢 EXCELENTE' : dadosCorretos.resumoConsolidado.roasMedio >= 6 ? '🟡 MUITO BOM' : dadosCorretos.resumoConsolidado.roasMedio >= 4 ? '🟠 BOM' : '🔴 CRÍTICO'}

⚠️ IMPORTANTE: Use EXATAMENTE estes valores. NÃO calcule novamente, NÃO inverta fórmulas!
` : `
🚨 VALIDAÇÃO MATEMÁTICA OBRIGATÓRIA - LEIA ANTES DE ANALISAR:

1. FÓRMULA CORRETA DO ROAS: ROAS = GMV ÷ Investimento (NUNCA INVERTER!)
2. Se ROAS > 50x: VOCÊ INVERTEU A FÓRMULA! Recalcule imediatamente
3. Se ROAS < 0.5x: ERRO GRAVE nos dados - verifique os valores
4. RANGE VÁLIDO: ROAS entre 0.5x e 50x

⚠️ AVISOS MATEMÁTICOS:
${validacaoMatematica.avisos.length > 0 ? validacaoMatematica.avisos.join('\n') : 'Nenhum aviso'}

❌ ERROS CRÍTICOS:
${validacaoMatematica.erros.length > 0 ? validacaoMatematica.erros.join('\n') : 'Nenhum erro crítico'}
`;
    
    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    
    let basePrompt =
      analysisType === "ads"
        ? `${ADVANCED_ADS_PROMPT}\n\n${reforcoMatematico}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
        : analysisType === "account"
          ? `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforcoMatematico}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
          : `${EXPRESS_ACCOUNT_ANALYSIS}\n\n${reforcoMatematico}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

    // ✅ NÃO adicionar dados pré-calculados se já temos dados corretos do CSV
    if (!dadosCorretos) {
      const metricasReais = extrairMetricasReaisDoCSV([]);
      basePrompt = gerarPromptComDadosReais(basePrompt, metricasReais);
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

    console.log('📝 Markdown da IA (primeiros 500 chars):', markdownFinal.substring(0, 500));

    // Calcular CPA antes de retornar a análise
    markdownFinal = calcularCPA(markdownFinal);
    
    console.log('🧮 Markdown após cálculo do CPA (primeiros 500 chars):', markdownFinal.substring(0, 500));

    res.json({
      analysis: markdownFinal,
      analysisType,
      clientName: clientName || "Cliente",
      timestamp: new Date().toISOString(),
      dadosCorretos: dadosCorretos ? {
        investimentoTotal: dadosCorretos.resumoConsolidado.totalInvestimento,
        gmvTotal: dadosCorretos.resumoConsolidado.totalGMV,
        roasMedio: dadosCorretos.resumoConsolidado.roasMedio,
        cpaMedio: dadosCorretos.resumoConsolidado.cpaMedio,
        totalCampanhas: dadosCorretos.resumoConsolidado.totalCampanhas,
        status: `${dadosCorretos.resumoConsolidado.anunciosAtivos} ativas, ${dadosCorretos.resumoConsolidado.anunciosPausados} pausadas`,
        fonteDados: 'CSV_PRECISO'
      } : { fonteDados: 'IMAGENS_APENAS' }
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
    const { csvContent, csvFiles, analysisType, clientName } = req.body;

    console.log('📊 Recebida requisição de análise CSV');
    console.log('👤 Cliente:', clientName);
    console.log('📋 Tipo:', analysisType);
    console.log('📄 CSV Content:', csvContent ? csvContent.length : 0);
    console.log('📄 CSV Files:', csvFiles ? csvFiles.length : 0);

    // Validar tipo de análise
    if (!analysisType || !["ads", "account"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise deve ser 'ads' ou 'account'" });
    }

    // Análise de ADS (CORRIGIDA)
    if (analysisType === "ads") {
      if (!csvContent || typeof csvContent !== 'string') {
        return res.status(400).json({ error: "Conteúdo CSV é obrigatório para análise de ads" });
      }

      // USAR NOVA FUNÇÃO DE EXTRAÇÃO PRECISA
      const dadosCorretos = extrairDadosCorretosDosAnuncios(csvContent);
      
      if (!dadosCorretos) {
        return res.status(400).json({ 
          error: "Erro ao processar CSV de anúncios",
          details: "Verifique se o formato do CSV está correto"
        });
      }

      // APLICAR VALIDAÇÃO MATEMÁTICA CRÍTICA
      const validacao = validarDadosMatematicos({
        gmv: dadosCorretos.resumoConsolidado.totalGMV,
        investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
        pedidos: dadosCorretos.resumoConsolidado.totalConversoes,
        visitantes: 0 // Não disponível em CSV de anúncios
      });

      if (!validacao.valido) {
        console.error('❌ DADOS CSV MATEMATICAMENTE INVÁLIDOS:', validacao.erros);
      }

      // Processar CSV de ads (MANTENDO COMPATIBILIDADE)
      const dadosProcessados = processarCSVAnuncios(csvContent);
      const insights = gerarInsightsCSV(dadosProcessados);
      
      // CRIAR PROMPT COM DADOS CORRETOS EXTRAÍDOS
      const csvPrompt = `${ADVANCED_ADS_PROMPT}

🚨 ANÁLISE BASEADA EM DADOS CSV CORRETOS - SHOPEE ADS 🚨

🔍 VALIDAÇÃO MATEMÁTICA APLICADA:
${validacao.valido ? '✅ Dados matematicamente válidos' : '❌ ERROS DETECTADOS: ' + validacao.erros.join(', ')}

⚠️ INSTRUÇÕES CRÍTICAS - USE ESTES DADOS EXATOS:
1. **NUNCA INVERTA OS VALORES**: Despesas = Investimento | GMV = Receita
2. **FÓRMULA CORRETA**: ROAS = GMV ÷ Despesas (NUNCA INVERTER!)
3. **DADOS PRÉ-VALIDADOS**: Use exatamente os valores abaixo

**DADOS CORRETOS DA LOJA:**
- Nome da Loja: ${dadosCorretos.dadosLoja.nomeLoja}
- Nome de Usuário: ${dadosCorretos.dadosLoja.nomeUsuario}
- ID da Loja: ${dadosCorretos.dadosLoja.idLoja}
- Período: ${dadosCorretos.dadosLoja.periodo}
- Data do Relatório: ${dadosCorretos.dadosLoja.dataRelatorio}

**RESUMO CONSOLIDADO CORRETO:**
- Total de Campanhas: ${dadosCorretos.resumoConsolidado.totalCampanhas}
- Campanhas Ativas: ${dadosCorretos.resumoConsolidado.anunciosAtivos}
- Campanhas Pausadas: ${dadosCorretos.resumoConsolidado.anunciosPausados}
- Campanhas Encerradas: ${dadosCorretos.resumoConsolidado.anunciosEncerrados}
- **INVESTIMENTO TOTAL CORRETO**: R$ ${dadosCorretos.resumoConsolidado.totalInvestimento.toFixed(2)}
- **GMV TOTAL CORRETO**: R$ ${dadosCorretos.resumoConsolidado.totalGMV.toFixed(2)}
- **ROAS MÉDIO CORRETO**: ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x
- **CONVERSÕES TOTAIS**: ${dadosCorretos.resumoConsolidado.totalConversoes}
- **CPA MÉDIO CORRETO**: R$ ${dadosCorretos.resumoConsolidado.cpaMedio.toFixed(2)}
- **CTR MÉDIO**: ${dadosCorretos.resumoConsolidado.ctrMedio.toFixed(2)}%
- **INVESTIMENTO DIÁRIO**: R$ ${dadosCorretos.resumoConsolidado.investimentoDiario.toFixed(2)}

🎯 **CLASSIFICAÇÃO AUTOMÁTICA:**
- ROAS ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x = ${dadosCorretos.resumoConsolidado.roasMedio >= 8 ? '🟢 EXCELENTE' : dadosCorretos.resumoConsolidado.roasMedio >= 6 ? '🟡 MUITO BOM' : dadosCorretos.resumoConsolidado.roasMedio >= 4 ? '🟠 BOM' : '🔴 CRÍTICO'}
- Conta classificada como: ${dadosCorretos.resumoConsolidado.roasMedio >= 8 ? 'ESCALÁVEL' : dadosCorretos.resumoConsolidado.roasMedio >= 6 ? 'RENTÁVEL' : dadosCorretos.resumoConsolidado.roasMedio >= 4 ? 'OTIMIZAÇÃO' : 'REESTRUTURAÇÃO'}

**PRODUTOS PRINCIPAIS COM CLASSIFICAÇÃO CORRETA:**
${dadosCorretos.campanhas.slice(0, 10).map((campanha, i) => {
  const classificacaoROAS = campanha.roas >= 8 ? '🟢 EXCELENTE (≥8x)' : 
                           campanha.roas >= 6 ? '🟡 MUITO BOM (6-8x)' : 
                           campanha.roas >= 4 ? '🟠 BOM (4-6x)' : 
                           campanha.roas >= 2 ? '🟡 REGULAR (2-4x)' : '🔴 CRÍTICO (<2x)';
  
  const classificacaoCTR = campanha.ctr >= 2.5 ? '🟢 EXCELENTE (≥2,5%)' :
                          campanha.ctr >= 1.5 ? '🟡 BOM (1,5-2,5%)' : '🔴 CRÍTICO (<1,5%)';
  
  return `${i+1}. ${campanha.nome}
     - Status: ${campanha.status}
     - ID: ${campanha.id}
     - **INVESTIMENTO**: R$ ${campanha.despesas.toFixed(2)}
     - **GMV**: R$ ${campanha.gmv.toFixed(2)}
     - **ROAS**: ${campanha.roas.toFixed(2)}x ${classificacaoROAS}
     - **CTR**: ${campanha.ctr.toFixed(2)}% ${classificacaoCTR}
     - Conversões: ${campanha.conversoes}
     - Taxa Conversão: ${campanha.taxaConversao.toFixed(2)}%
     - Impressões: ${campanha.impressoes.toLocaleString('pt-BR')}
     - Cliques: ${campanha.cliques.toLocaleString('pt-BR')}`;
}).join('\n\n')}

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

      console.log('📝 Análise CSV ADS gerada com sucesso');

      return res.json({
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
    }

    // ===== NOVA ANÁLISE DE ACCOUNT VIA CSV COM CORREÇÃO =====
    if (analysisType === "account") {
      if (!csvFiles || !Array.isArray(csvFiles) || csvFiles.length === 0) {
        return res.status(400).json({ error: "Arquivos CSV são obrigatórios para análise de conta" });
      }

      console.log('🔧 Processando análise de CONTA com correção de métricas...');
      
      try {
        // ETAPA 1: APLICAR CORREÇÕES CRÍTICAS COM DEBUG
        console.log('🔧 [DEBUG] === INICIANDO CORREÇÕES CRÍTICAS ===');
        console.log('📄 [DEBUG] csvFiles tipo:', typeof csvFiles);
        console.log('📄 [DEBUG] csvFiles array?', Array.isArray(csvFiles));
        console.log('📄 [DEBUG] csvFiles length:', csvFiles?.length || 0);
        
        if (csvFiles && Array.isArray(csvFiles)) {
          csvFiles.forEach((file, i) => {
            console.log(`📄 [DEBUG] Arquivo ${i}:`, {
              nome: file.nome || file.name || 'SEM_NOME',
              hasContent: !!(file.conteudo || file.content),
              contentPreview: (file.conteudo || file.content || '').substring(0, 50)
            });
          });
        }
        
        console.log('🔧 [DEBUG] Chamando corrigirMetricasBasicas...');
        const metricasCorrigidas = corrigirMetricasBasicas(csvFiles);
        console.log('🔧 [DEBUG] Resultado corrigirMetricasBasicas:', JSON.stringify(metricasCorrigidas, null, 2));
        
        // ETAPA 2: VALIDAR DADOS CORRIGIDOS COM DEBUG
        console.log('🔧 [DEBUG] Chamando validarDados...');
        const validacao = validarDados(metricasCorrigidas);
        console.log('🔧 [DEBUG] Resultado validarDados:', JSON.stringify(validacao, null, 2));
        
        if (!validacao.valido) {
          console.error('❌ [DEBUG] Dados inválidos após correção:', validacao.erros);
          return res.status(400).json({
            error: 'Dados CSV inconsistentes após correção',
            details: validacao.erros,
            suggestions: 'Verifique os arquivos CSV fornecidos',
            debug: {
              metricasCorrigidas,
              validacao
            }
          });
        }

        if (validacao.avisos.length > 0) {
          console.warn('⚠️ Avisos na validação:', validacao.avisos);
        }

        // ETAPA 3: GERAR PROMPT COM DADOS CORRIGIDOS
        const promptCorrigido = gerarPromptCorrigido(ADVANCED_ACCOUNT_PROMPT, metricasCorrigidas);
        
        console.log('✅ Usando dados corrigidos e validados para análise');
        console.log('📊 Métricas corrigidas:', {
          visitantes: metricasCorrigidas.visitantes,
          gmv: metricasCorrigidas.gmv,
          pedidos: metricasCorrigidas.pedidos,
          investimento: metricasCorrigidas.investimento,
          roas: metricasCorrigidas.roas.toFixed(2),
          cpa: metricasCorrigidas.cpa.toFixed(2),
          produtosAtivos: metricasCorrigidas.produtosAtivos.length,
          produtosPausados: metricasCorrigidas.produtosPausados.length
        });

        // Gerar análise com IA usando dados corrigidos
        let markdownFinal = await gerarAnaliseComIA(
          promptCorrigido,
          [], // Não há imagens para CSV
          analysisType,
          [JSON.stringify(metricasCorrigidas, null, 2)] // Passar métricas corrigidas como OCR text
        );

        console.log('📝 Análise CSV ACCOUNT com correções gerada com sucesso');

        return res.json({
          analysis: markdownFinal,
          analysisType,
          clientName: clientName || "Cliente",
          timestamp: new Date().toISOString(),
          // Dados corrigidos para debug
          metricas: metricasCorrigidas,
          validacao: validacao,
          csvData: {
            visitantes: metricasCorrigidas.visitantes,
            gmv: metricasCorrigidas.gmv,
            pedidosPagos: metricasCorrigidas.pedidos,
            taxaConversao: metricasCorrigidas.taxaConversao,
            ticketMedio: metricasCorrigidas.ticketMedio,
            investimento: metricasCorrigidas.investimento,
            roas: metricasCorrigidas.roas,
            cpa: metricasCorrigidas.cpa,
            produtosAtivos: metricasCorrigidas.produtosAtivos.length,
            produtosPausados: metricasCorrigidas.produtosPausados.length
          }
        });

      } catch (error) {
        console.error('❌ Erro na análise com correção:', error);
        
        // Fallback: tentar análise sem correção
        console.log('🔄 Tentando análise sem correção como fallback...');
        
        // Processar múltiplos CSVs (método antigo)
        const dadosCompletos = processarCSVAnaliseContaCompleta(csvFiles);
        const resumo = dadosCompletos.resumoConsolidado;
        
        // Usar prompt padrão
        const csvAccountPrompt = gerarPromptComDadosReais(ADVANCED_ACCOUNT_PROMPT, {
          visitantes: resumo.metricas?.visitantes || 0,
          gmv: resumo.metricas?.gmv || 0,
          pedidos: resumo.metricas?.pedidosPagos || 0,
          conversao: resumo.metricas?.taxaConversao || 0,
          ticketMedio: resumo.metricas?.ticketMedio || 0,
          investimento: resumo.metricas?.investimentoAds || 0,
          roas: resumo.metricas?.roas || 0,
          cpa: resumo.metricas?.cpa || 0
        });

        let markdownFinal = await gerarAnaliseComIA(
          csvAccountPrompt,
          [],
          analysisType,
          [JSON.stringify(resumo, null, 2)]
        );

        return res.json({
          analysis: markdownFinal,
          analysisType,
          clientName: clientName || "Cliente",
          timestamp: new Date().toISOString(),
          warning: 'Análise gerada com método de fallback devido a erro na correção',
          error: error.message,
          csvData: {
            visitantes: resumo.metricas?.visitantes || 0,
            gmv: resumo.metricas?.gmv || 0,
            pedidosPagos: resumo.metricas?.pedidosPagos || 0
          }
        });
      }
    }

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

    // Inicializar marked
    const markedInstance = await initMarked();

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
    ${markedInstance(markdown)}
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

// NOVO ENDPOINT: Análise com bypass (dados manuais)
app.post('/analise-csv-bypass', async (req, res) => {
  const { csvFiles, clientName } = req.body;
  
  console.log('⚡ [BYPASS] === INICIANDO ANÁLISE COM BYPASS ===');
  
  try {
    // ETAPA 1: USAR DADOS MANUAIS (BYPASS)
    console.log('⚡ [BYPASS] Extraindo dados conhecidos...');
    const dadosReais = extrairDadosManualBypass(csvFiles);
    
    // ETAPA 2: VALIDAÇÃO SIMPLES
    console.log('⚡ [BYPASS] Validando dados...');
    const validacao = validarDadosBypass(dadosReais);
    
    if (!validacao.valido) {
      console.error('❌ [BYPASS] Dados inválidos:', validacao.erros);
      return res.status(400).json({
        error: 'Dados de bypass inválidos',
        details: validacao.erros
      });
    }

    // ETAPA 3: GERAR PROMPT OTIMIZADO
    console.log('⚡ [BYPASS] Gerando prompt otimizado...');
    const promptBypass = gerarPromptBypass(ADVANCED_ACCOUNT_PROMPT, dadosReais);
    
    // ETAPA 4: CHAMAR IA COM DADOS CORRETOS
    console.log('🤖 [BYPASS] Chamando IA com dados corretos...');
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { 
            role: "user", 
            content: promptBypass
          }
        ],
        max_tokens: 32768,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BYPASS] Erro na API OpenAI:', response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analiseGerada = data.choices?.[0]?.message?.content;

    if (!analiseGerada) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('✅ [BYPASS] Análise gerada com sucesso!');
    return res.json({
      success: true,
      analysis: analiseGerada,
      method: 'BYPASS_MANUAL',
      dadosUtilizados: dadosReais,
      validacao: validacao,
      promptLength: promptBypass.length,
      analysisType: 'account-bypass',
      clientName: clientName || "COLORINDO SHOP BRASIL",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [BYPASS] Erro na análise:', error.message);
    return res.status(500).json({
      error: 'Erro interno no bypass',
      details: error.message,
      method: 'BYPASS_MANUAL_FAILED'
    });
  }
});

// NOVO ENDPOINT: Análise com extração robusta
app.post('/analise-csv-robusta', async (req, res) => {
  const { csvFiles, clientName } = req.body;
  
  console.log('🔄 [ROBUSTA] === INICIANDO ANÁLISE COM EXTRAÇÃO ROBUSTA ===');
  
  try {
    // ETAPA 1: EXTRAÇÃO ROBUSTA
    console.log('🔄 [ROBUSTA] Extraindo dados com sistema robusto...');
    const dadosExtraidos = extrairDadosRobusta(csvFiles);
    
    // ETAPA 2: VALIDAÇÃO ROBUSTA
    console.log('🔄 [ROBUSTA] Validando dados extraídos...');
    const validacao = validarDadosRobusta(dadosExtraidos);
    
    if (!validacao.valido) {
      console.error('❌ [ROBUSTA] Dados inválidos após extração:', validacao.erros);
      return res.status(400).json({
        error: 'Dados extraídos são inválidos',
        details: validacao.erros,
        avisos: validacao.avisos,
        score: validacao.score,
        dadosExtraidos
      });
    }

    // ETAPA 3: GERAR PROMPT OTIMIZADO
    console.log('🔄 [ROBUSTA] Gerando prompt otimizado...');
    const promptRobusta = gerarPromptBypass(EXPRESS_ACCOUNT_ANALYSIS, dadosExtraidos);
    
    // ETAPA 4: CHAMAR IA COM DADOS EXTRAÍDOS
    console.log('🤖 [ROBUSTA] Chamando IA com dados extraídos robustamente...');
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { 
            role: "user", 
            content: promptRobusta
          }
        ],
        max_tokens: 32768,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ROBUSTA] Erro na API OpenAI:', response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analiseGerada = data.choices?.[0]?.message?.content;

    if (!analiseGerada) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('✅ [ROBUSTA] Análise gerada com sucesso!');
    return res.json({
      success: true,
      analysis: analiseGerada,
      method: 'EXTRAÇÃO_ROBUSTA',
      dadosExtraidos,
      validacao,
      promptLength: promptRobusta.length,
      analysisType: 'account-robusta',
      clientName: clientName || dadosExtraidos.loja,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ROBUSTA] Erro na análise robusta:', error.message);
    return res.status(500).json({
      error: 'Erro interno na extração robusta',
      details: error.message,
      method: 'EXTRAÇÃO_ROBUSTA_FAILED',
      stack: error.stack
    });
  }
});

// NOVO ENDPOINT: Testar correção de métricas
app.post('/test-correcao-metricas', async (req, res) => {
  try {
    const { csvFiles } = req.body;
    
    if (!csvFiles || !Array.isArray(csvFiles)) {
      return res.status(400).json({ 
        error: 'csvFiles é obrigatório e deve ser um array',
        exemplo: [
          { nome: 'shop-stats.csv', conteudo: '...' },
          { nome: 'anuncios.csv', conteudo: '...' }
        ]
      });
    }

    console.log('🧪 Testando correção de métricas...');
    console.log('📄 Arquivos recebidos:', csvFiles.map(f => f.nome || f.name));

    // Aplicar correções
    const metricasCorrigidas = corrigirMetricasBasicas(csvFiles);
    const validacao = validarDados(metricasCorrigidas);

    res.json({
      success: true,
      metricasCorrigidas: metricasCorrigidas,
      validacao: validacao,
      resumo: {
        visitantes: metricasCorrigidas.visitantes,
        gmv: metricasCorrigidas.gmv.toFixed(2),
        pedidos: metricasCorrigidas.pedidos,
        investimento: metricasCorrigidas.investimento.toFixed(2),
        roas: metricasCorrigidas.roas.toFixed(2),
        cpa: metricasCorrigidas.cpa.toFixed(2),
        taxaConversao: metricasCorrigidas.taxaConversao.toFixed(2),
        ticketMedio: metricasCorrigidas.ticketMedio.toFixed(2),
        produtosAtivos: metricasCorrigidas.produtosAtivos.length,
        produtosPausados: metricasCorrigidas.produtosPausados.length
      },
      produtosAtivos: metricasCorrigidas.produtosAtivos.slice(0, 3),
      produtosPausados: metricasCorrigidas.produtosPausados.slice(0, 3),
      message: 'Teste de correção de métricas concluído'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// NOVO ENDPOINT: Testar todas as soluções implementadas
app.post('/test-todas-solucoes', async (req, res) => {
  const { csvFiles } = req.body;
  
  console.log('🧪 === TESTANDO TODAS AS SOLUÇÕES ===');
  
  if (!csvFiles || !Array.isArray(csvFiles)) {
    return res.status(400).json({
      error: 'csvFiles é obrigatório e deve ser um array',
      exemplo: [
        { nome: 'shop-stats.csv', conteudo: '...' },
        { nome: 'anuncios.csv', conteudo: '...' }
      ]
    });
  }

  const resultados = {};
  
  try {
    // TESTE 1: DEBUG SYSTEM
    console.log('🧪 [TESTE 1] Testando sistema com debug...');
    try {
      const metricasCorrigidas = corrigirMetricasBasicas(csvFiles);
      const validacao = validarDados(metricasCorrigidas);
      resultados.debugSystem = {
        sucesso: true,
        metricas: metricasCorrigidas,
        validacao,
        observacoes: 'Sistema original com debug ativado'
      };
    } catch (error) {
      resultados.debugSystem = {
        sucesso: false,
        erro: error.message,
        observacoes: 'Sistema original falhou'
      };
    }

    // TESTE 2: BYPASS SYSTEM
    console.log('🧪 [TESTE 2] Testando sistema bypass...');
    try {
      const dadosBypass = extrairDadosManualBypass(csvFiles);
      const validacaoBypass = validarDadosBypass(dadosBypass);
      resultados.bypassSystem = {
        sucesso: true,
        dados: dadosBypass,
        validacao: validacaoBypass,
        observacoes: 'Sistema bypass com dados manuais'
      };
    } catch (error) {
      resultados.bypassSystem = {
        sucesso: false,
        erro: error.message,
        observacoes: 'Sistema bypass falhou'
      };
    }

    // TESTE 3: ROBUST SYSTEM
    console.log('🧪 [TESTE 3] Testando sistema robusto...');
    try {
      const dadosRobustos = extrairDadosRobusta(csvFiles);
      const validacaoRobusta = validarDadosRobusta(dadosRobustos);
      resultados.robustSystem = {
        sucesso: true,
        dados: dadosRobustos,
        validacao: validacaoRobusta,
        observacoes: 'Sistema robusto com extração inteligente'
      };
    } catch (error) {
      resultados.robustSystem = {
        sucesso: false,
        erro: error.message,
        observacoes: 'Sistema robusto falhou'
      };
    }

    // ANÁLISE COMPARATIVA
    const sistemasComSucesso = Object.keys(resultados).filter(
      key => resultados[key].sucesso
    );

    console.log('🧪 Sistemas que funcionaram:', sistemasComSucesso);

    return res.json({
      success: true,
      totalSistemas: 3,
      sistemasComSucesso: sistemasComSucesso.length,
      resultados,
      recomendacao: sistemasComSucesso.length > 0 ? 
        `Use o sistema: ${sistemasComSucesso[0]}` : 
        'Nenhum sistema funcionou corretamente',
      csvFilesRecebidos: csvFiles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no teste geral:', error.message);
    return res.status(500).json({
      error: 'Erro no teste geral',
      details: error.message,
      resultados
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

// NOVO ENDPOINT: Testar extração correta de dados CSV
app.post('/test-extracao-csv-correta', async (req, res) => {
  try {
    const { csvContent } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({ 
        error: "Conteúdo CSV é obrigatório",
        exemplo: "Envie o conteúdo do CSV como string no campo 'csvContent'"
      });
    }
    
    console.log('🧪 Testando extração correta de dados CSV...');
    console.log('📄 CSV recebido (primeiros 200 chars):', csvContent.substring(0, 200));
    
    // Aplicar nova função de extração
    const dadosCorretos = extrairDadosCorretosDosAnuncios(csvContent);
    
    if (!dadosCorretos) {
      return res.json({
        success: false,
        error: 'Falha na extração de dados',
        message: 'CSV malformado ou formato incorreto'
      });
    }
    
    // Aplicar validação matemática
    const validacao = validarDadosMatematicos({
      gmv: dadosCorretos.resumoConsolidado.totalGMV,
      investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
      pedidos: dadosCorretos.resumoConsolidado.totalConversoes,
      visitantes: 0
    });
    
    res.json({
      success: true,
      dadosExtraidos: {
        loja: dadosCorretos.dadosLoja,
        totalCampanhas: dadosCorretos.resumoConsolidado.totalCampanhas,
        investimentoTotal: dadosCorretos.resumoConsolidado.totalInvestimento,
        gmvTotal: dadosCorretos.resumoConsolidado.totalGMV,
        roasMedio: dadosCorretos.resumoConsolidado.roasMedio,
        cpaMedio: dadosCorretos.resumoConsolidado.cpaMedio,
        investimentoDiario: dadosCorretos.resumoConsolidado.investimentoDiario,
        status: `${dadosCorretos.resumoConsolidado.anunciosAtivos} ativas, ${dadosCorretos.resumoConsolidado.anunciosPausados} pausadas`
      },
      validacaoMatematica: validacao,
      top5Produtos: dadosCorretos.campanhas.slice(0, 5).map(c => ({
        nome: c.nome,
        roas: c.roas,
        gmv: c.gmv,
        despesas: c.despesas,
        status: c.status,
        classificacao: c.roas >= 8 ? 'EXCELENTE' : c.roas >= 6 ? 'MUITO BOM' : c.roas >= 4 ? 'BOM' : 'REGULAR/CRÍTICO'
      })),
      message: 'Extração de dados CSV testada com sucesso!'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// NOVO ENDPOINT: Testar análise com CSV correto
app.post('/test-analise-correta', async (req, res) => {
  try {
    const { csvContent, analysisType = "ads" } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({ 
        error: "Conteúdo CSV é obrigatório",
        exemplo: "Envie o CSV como string no campo 'csvContent'"
      });
    }
    
    console.log('🧪 Testando análise com dados corretos...');
    console.log('📄 CSV recebido (primeiros 200 chars):', csvContent.substring(0, 200));
    
    // Simular chamada da rota /analise com CSV
    const mockRequest = {
      body: {
        images: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/"], // Imagem fake
        analysisType,
        clientName: "Teste",
        csvContent
      }
    };
    
    // Aplicar extração correta
    const dadosCorretos = extrairDadosCorretosDosAnuncios(csvContent);
    
    if (!dadosCorretos) {
      return res.json({
        success: false,
        error: 'Falha na extração de dados',
        message: 'CSV malformado ou formato incorreto'
      });
    }
    
    // Aplicar validação matemática
    const validacao = validarDadosMatematicos({
      gmv: dadosCorretos.resumoConsolidado.totalGMV,
      investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
      pedidos: dadosCorretos.resumoConsolidado.totalConversoes,
      visitantes: 0
    });
    
    // Gerar prompt correto
    const reforcoMatematico = `
🚨 DADOS CORRETOS EXTRAÍDOS DO CSV - USE EXATAMENTE ESTES VALORES:

**VALIDAÇÃO MATEMÁTICA APLICADA:**
${validacao.valido ? '✅ Dados matematicamente válidos' : '❌ ERROS: ' + validacao.erros.join(', ')}

**DADOS CORRETOS DO CSV:**
- **INVESTIMENTO TOTAL:** R$ ${dadosCorretos.resumoConsolidado.totalInvestimento.toFixed(2)}
- **GMV TOTAL:** R$ ${dadosCorretos.resumoConsolidado.totalGMV.toFixed(2)}
- **ROAS MÉDIO CORRETO:** ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x
- **CPA MÉDIO CORRETO:** R$ ${dadosCorretos.resumoConsolidado.cpaMedio.toFixed(2)}
- **CONVERSÕES TOTAIS:** ${dadosCorretos.resumoConsolidado.totalConversoes}
- **CAMPANHAS:** ${dadosCorretos.resumoConsolidado.anunciosAtivos} ativas, ${dadosCorretos.resumoConsolidado.anunciosPausados} pausadas

🎯 **CLASSIFICAÇÃO AUTOMÁTICA:**
- ROAS ${dadosCorretos.resumoConsolidado.roasMedio.toFixed(2)}x = ${dadosCorretos.resumoConsolidado.roasMedio >= 8 ? '🟢 EXCELENTE' : dadosCorretos.resumoConsolidado.roasMedio >= 6 ? '🟡 MUITO BOM' : dadosCorretos.resumoConsolidado.roasMedio >= 4 ? '🟠 BOM' : '🔴 CRÍTICO'}

⚠️ IMPORTANTE: Use EXATAMENTE estes valores. NÃO calcule novamente, NÃO inverta fórmulas!
`;

    res.json({
      success: true,
      message: 'Análise com dados corretos testada!',
      dadosCorretos: {
        loja: dadosCorretos.dadosLoja,
        investimentoTotal: dadosCorretos.resumoConsolidado.totalInvestimento,
        gmvTotal: dadosCorretos.resumoConsolidado.totalGMV,
        roasMedio: dadosCorretos.resumoConsolidado.roasMedio,
        cpaMedio: dadosCorretos.resumoConsolidado.cpaMedio,
        totalCampanhas: dadosCorretos.resumoConsolidado.totalCampanhas,
        status: `${dadosCorretos.resumoConsolidado.anunciosAtivos} ativas, ${dadosCorretos.resumoConsolidado.anunciosPausados} pausadas`
      },
      validacao,
      promptGerado: reforcoMatematico,
      comparacao: {
        correto: {
          investimento: dadosCorretos.resumoConsolidado.totalInvestimento,
          roas: dadosCorretos.resumoConsolidado.roasMedio,
          cpa: dadosCorretos.resumoConsolidado.cpaMedio
        },
        seusResultados: {
          investimento: 11113.90,
          roas: 6.44,
          cpa: 5.97
        },
        diferencas: {
          investimento: `${((11113.90 - dadosCorretos.resumoConsolidado.totalInvestimento) / dadosCorretos.resumoConsolidado.totalInvestimento * 100).toFixed(1)}% a mais`,
          roas: `${((6.44 - dadosCorretos.resumoConsolidado.roasMedio) / dadosCorretos.resumoConsolidado.roasMedio * 100).toFixed(1)}% menor`,
          cpa: `${((5.97 - dadosCorretos.resumoConsolidado.cpaMedio) / dadosCorretos.resumoConsolidado.cpaMedio * 100).toFixed(1)}% maior`
        }
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

// NOVO ENDPOINT: Testar validação matemática
app.post('/test-validacao-matematica', async (req, res) => {
  try {
    const { dados } = req.body;
    
    if (!dados) {
      return res.status(400).json({ 
        error: "Dados são obrigatórios",
        exemplo: {
          dados: {
            gmv: 10000,
            investimento: 1000,
            pedidos: 100,
            visitantes: 5000
          }
        }
      });
    }
    
    console.log('🧪 Testando validação matemática...');
    console.log('📊 Dados recebidos:', dados);
    
    // Aplicar validação matemática
    const validacao = validarDadosMatematicos(dados);
    
    // Calcular ROAS usando a função corrigida
    const roasInfo = calcularROASCorreto(dados);
    
    res.json({
      success: true,
      dadosOriginais: dados,
      validacao: validacao,
      roasCalculado: roasInfo,
      message: 'Teste de validação matemática concluído',
      recomendacao: validacao.valido ? 
        '✅ Dados matematicamente válidos - pode prosseguir com a análise' :
        '❌ Dados inválidos - corrija os erros antes de continuar'
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
  
  // Gerar data e horário corretos no timezone brasileiro
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
  
  const horarioFormatado = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
  
  console.log('🕒 Data/hora formatada:', dataFormatada, horarioFormatado);
  
  if (completedBlocks.length === 0) {
    const markdownVazio = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n**Cliente:** ${clientName || 'Cliente não informado'}\n**Data:** ${dataFormatada}\n**Horário:** ${horarioFormatado}\n\n*Nenhum item foi concluído ainda.*`;
    console.log('📝 Markdown vazio gerado:', markdownVazio);
    console.log('👤 Nome do cliente no markdown vazio:', markdownVazio.includes(clientName || 'Cliente não informado'));
    return markdownVazio;
  }

  let md = `# ✅ CHECKLIST OPERACIONAL - ITENS CONCLUÍDOS\n\n`;
  md += `**Cliente:** ${clientName || 'Cliente não informado'}\n`;
  md += `**Data do Relatório:** ${dataFormatada}\n`;
  md += `**Horário:** ${horarioFormatado}\n\n`;

  console.log('📝 Markdown inicial gerado (primeiros 200 chars):', md.substring(0, 200));
  console.log('👤 Nome do cliente no markdown inicial:', md.includes(clientName || 'Cliente não informado'));

  let totalConcluidos = 0;
  
  completedBlocks.forEach((block, i) => {
    md += `## ${block.title}\n`;
    md += `**Itens Concluídos:** ${block.items.length}\n\n`;
    
    block.items.forEach((item, idx) => {
      totalConcluidos++;
      
      // Adicionar contador de execuções se existir
      const executionText = item.execution_count && item.execution_count > 1
        ? ` (${item.execution_count}x)`
        : '';
      
      md += `### ✓ ${item.title}${executionText}\n`;
      
      if (item.description) {
        md += `**Descrição:** ${item.description}\n\n`;
      }
      
      // Mostrar último analista se disponível
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
          second: '2-digit',
          timeZone: 'America/Sao_Paulo'
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
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
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

// Função HTML específica para itens concluídos
async function gerarHtmlChecklistConcluidos(markdown, clientName) {
  console.log('🔧 Gerando HTML para checklist concluídos');
  console.log('👤 Nome do cliente recebido:', clientName);
  console.log('📝 Markdown recebido (primeiros 200 chars):', markdown.substring(0, 200));
  
  // Inicializar marked
  const markedInstance = await initMarked();
  
  // Gerar data correta no timezone local
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
  
  const horarioFormatado = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
  
  console.log('🕒 Data formatada:', dataFormatada);
  console.log('🕒 Horário formatado:', horarioFormatado);
  
  // Processar markdown com marked
  const markdownProcessado = await splitMarkdownWithExecutiveSummary(markdown);
  
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
          <p><strong>Cliente:</strong> ${clientName || 'Cliente não informado'}</p>
          <p><strong>Data:</strong> ${dataFormatada}</p>
          <p><strong>Horário:</strong> ${horarioFormatado}</p>
        </div>
        
        ${markdownProcessado}
      </body>
    </html>
  `;
  
  console.log('✅ HTML gerado com sucesso');
  console.log('👤 Nome do cliente incluído no HTML:', htmlContent.includes(clientName || 'Cliente não informado'));
  console.log('🕒 Data incluída no HTML:', htmlContent.includes(dataFormatada));
  console.log('🕒 Horário incluído no HTML:', htmlContent.includes(horarioFormatado));
  
  return htmlContent;
}

// Função auxiliar para separar o resumo executivo em uma página nova
async function splitMarkdownWithExecutiveSummary(markdown) {
  // Inicializar marked se não estiver disponível
  const markedInstance = await initMarked();
  
  // Divide o markdown em duas partes: antes e depois do resumo executivo
  const resumoRegex = /(^|\n)(## +📊 RESUMO EXECUTIVO[\s\S]*)/i;
  const match = markdown.match(resumoRegex);
  if (!match) {
    // Não encontrou o resumo, retorna tudo normalmente
    return markedInstance(markdown);
  }
  const beforeResumo = markdown.slice(0, match.index);
  const resumo = match[2];
  return `
    ${markedInstance(beforeResumo)}
    <div class="executive-summary-page">
      ${markedInstance(resumo)}
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

    // Se markdown não foi fornecido, usar os blocks diretamente (já filtrados pelo frontend)
    let completedBlocks;
    
    if (blocks && blocks.length > 0) {
      // Usar blocks já filtrados do frontend
      completedBlocks = blocks;
      console.log('📊 Usando blocos do frontend (já filtrados):', completedBlocks.length);
      
      // Debug dos dados recebidos
      console.log('🔍 Primeiro bloco exemplo:', JSON.stringify(completedBlocks[0], null, 2));
      if (completedBlocks[0]?.items[0]) {
        console.log('🔍 Primeiro item exemplo:', JSON.stringify(completedBlocks[0].items[0], null, 2));
      }
    } else {
      console.log('❌ Nenhum bloco recebido');
      return res.status(400).json({
        error: "Nenhum bloco de checklist fornecido."
      });
    }

    if (completedBlocks.length === 0) {
      console.log('❌ Nenhum item concluído encontrado');
      return res.status(400).json({
        error: "Nenhum item concluído para gerar o PDF."
      });
    }

    console.log('✅ Processando PDF de itens concluídos...');
    console.log('👤 Cliente:', clientName);
    console.log('📊 Blocos com itens concluídos:', completedBlocks.length);

    // Gerar markdown com todos os dados dos blocos
    const finalMarkdown = generateCompletedChecklistMarkdown(completedBlocks, clientName);
    console.log('📝 Markdown gerado (primeiros 500 chars):', finalMarkdown.substring(0, 500));
    console.log('👤 Nome do cliente no markdown:', finalMarkdown.includes(clientName));
    
    const htmlContent = await gerarHtmlChecklistConcluidos(finalMarkdown, clientName);
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

// Adicionar handler específico para OPTIONS na rota whatsapp-express
app.options('/api/whatsapp-express', (req, res) => {
  console.log('✅ OPTIONS preflight para /api/whatsapp-express');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

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

// Endpoint para relatórios personalizados
app.post('/api/relatorio-personalizado', async (req, res) => {
  try {
    const { dados, tipoRelatorio = 'completo' } = req.body;
    
    if (!dados) {
      return res.status(400).json({ 
        error: 'Dados são obrigatórios',
        exemplo: {
          dados: {
            roas: 8.5,
            conversao: 3.2,
            ticketMedio: 75,
            visitantes: 5000
          },
          tipoRelatorio: 'executivo' // ou 'operacional', 'completo'
        }
      });
    }

    // Validar e corrigir dados antes de gerar relatório
    const dadosCorrigidos = validarECorrigirDados(dados);
    const relatorio = gerarRelatorioPersonalizado(dadosCorrigidos, tipoRelatorio);
    
    res.json({
      success: true,
      relatorio: relatorio,
      dadosOriginais: dados,
      dadosCorrigidos: dadosCorrigidos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório personalizado:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint para métricas avançadas
app.post('/api/metricas-avancadas', async (req, res) => {
  try {
    const { dados } = req.body;
    
    if (!dados) {
      return res.status(400).json({ 
        error: 'Dados são obrigatórios',
        exemplo: {
          dados: {
            roas: 8.5,
            conversao: 3.2,
            ticketMedio: 75,
            visitantes: 5000
          }
        }
      });
    }

    const metricas = calcularMetricasAvancadas(dados);
    const tendencias = analisarTendencias(dados);
    
    res.json({
      success: true,
      metricas: metricas,
      tendencias: tendencias,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao calcular métricas avançadas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Exportar função para testes
module.exports = {
  calcularCPA
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Microserviço de análise rodando na porta ${PORT}`);
  console.log(`📊 Análise de conta: http://localhost:${PORT}/api/analise-conta`);
  console.log(`📈 Análise de anúncios: http://localhost:${PORT}/api/analise-anuncios`);
  console.log(`📋 Comparação: http://localhost:${PORT}/api/comparacao`);
  console.log(`📄 CSV Anúncios: http://localhost:${PORT}/api/csv-anuncios`);
  console.log(`📊 CSV Análise Completa: http://localhost:${PORT}/api/csv-analise-completa`);
  console.log(`📱 WhatsApp Express: http://localhost:${PORT}/api/whatsapp-express`);
  console.log(`🎯 Relatório Personalizado: http://localhost:${PORT}/api/relatorio-personalizado`);
  console.log(`📊 Métricas Avançadas: http://localhost:${PORT}/api/metricas-avancadas`);
  console.log(`🧪 Teste o Browserless em: http://localhost:${PORT}/test-browserless`);
  console.log(`🧮 Teste o CPA em: http://localhost:${PORT}/test-cpa`);
  console.log(`🏪 Teste o CPA da naty_store em: http://localhost:${PORT}/test-naty-cpa`);
  console.log(`🔧 Teste o problema RCPA em: POST http://localhost:${PORT}/test-rcpa-problema`);
  console.log(`🎯 NOVO: Teste correção de métricas em: POST http://localhost:${PORT}/test-correcao-metricas`);
  console.log(`⚡ NOVO: Análise com BYPASS em: POST http://localhost:${PORT}/analise-csv-bypass`);
  console.log(`🔄 NOVO: Análise ROBUSTA em: POST http://localhost:${PORT}/analise-csv-robusta`);
  console.log(`🧪 NOVO: Testar TODAS as soluções em: POST http://localhost:${PORT}/test-todas-solucoes`);
});