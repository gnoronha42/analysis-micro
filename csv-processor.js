// Função para processar CSV de anúncios
function processarCSVAnuncios(csvContent) {
  try {
    console.log('📊 Iniciando processamento de CSV de anúncios...');
    const linhas = csvContent.split('\n');
    const anuncios = [];
    let dadosLoja = {};
    let mapeamentoColunas = {};
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      
      // Extrair dados da loja
      if (linha.includes('Nome de Usuário,')) {
        dadosLoja.nomeUsuario = linha.split(',')[1];
      } else if (linha.includes('Nome da loja,')) {
        dadosLoja.nomeLoja = linha.split(',')[1];
      } else if (linha.includes('ID da Loja,')) {
        dadosLoja.idLoja = linha.split(',')[1];
      } else if (linha.includes('Data de Criação do Relatório,')) {
        dadosLoja.dataRelatorio = linha.split(',')[1];
      } else if (linha.includes('Período,')) {
        dadosLoja.periodo = linha.split(',')[1];
      }
      
      // Identificar cabeçalho e criar mapeamento dinâmico
      if (linha.startsWith('#,Nome do Anúncio')) {
        const cabecalhos = linha.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || linha.split(',');
        cabecalhos.forEach((cabecalho, index) => {
          const nome = cabecalho.replace(/"/g, '').trim();
          mapeamentoColunas[nome] = index;
        });
        console.log('📋 Mapeamento de colunas criado:', mapeamentoColunas);
        continue;
      }
      
      // Processar linhas de anúncios
      if (linha.match(/^\d+,/)) {
        try {
          const linhaAnuncio = linha;
          if (linhaAnuncio && linhaAnuncio.trim() !== '') {
            const dados = linhaAnuncio.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || linhaAnuncio.split(',');
            if (dados.length >= 24) { // Verificar se tem dados suficientes
              // Usar mapeamento dinâmico para extrair valores
              const impressoes = parseInt(dados[mapeamentoColunas['Impressões']]?.replace(/[^\d]/g, '')) || 0;
              const cliques = parseInt(dados[mapeamentoColunas['Cliques']]?.replace(/[^\d]/g, '')) || 0;
              const conversoes = parseInt(dados[mapeamentoColunas['Conversões']]?.replace(/[^\d]/g, '')) || 0;
              const conversoesDiretas = parseInt(dados[mapeamentoColunas['Conversões Diretas']]?.replace(/[^\d]/g, '')) || 0;
              const itensVendidos = parseInt(dados[mapeamentoColunas['Itens Vendidos']]?.replace(/[^\d]/g, '')) || 0;
              const itensVendidosDiretos = parseInt(dados[mapeamentoColunas['Itens Vendidos Diretos']]?.replace(/[^\d]/g, '')) || 0;
              
              // Processar valores monetários
              const gmv = parseFloat(dados[mapeamentoColunas['GMV']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              const receitaDireta = parseFloat(dados[mapeamentoColunas['Receita direta']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              const despesas = parseFloat(dados[mapeamentoColunas['Despesas']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              
              // Processar ROAS (pode vir como decimal)
              const roas = parseFloat(dados[mapeamentoColunas['ROAS']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              const roasDireto = parseFloat(dados[mapeamentoColunas['ROAS Direto']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
              
              // Processar percentuais (CTR, taxas de conversão)
              const ctr = dados[mapeamentoColunas['CTR']]?.replace('%', '') || '0';
              const taxaConversao = dados[mapeamentoColunas['Taxa de Conversão']]?.replace('%', '') || '0';
              const taxaConversaoDireta = dados[mapeamentoColunas['Taxa de Conversão Direta']]?.replace('%', '') || '0';
              
              console.log(`📊 Processando ${dados[1]}: Despesas=${despesas}, GMV=${gmv}, ROAS=${roas}, Conversões=${conversoes}`);
              
              anuncios.push({
                numero: dados[mapeamentoColunas['#']],
                nome: dados[mapeamentoColunas['Nome do Anúncio']]?.replace(/"/g, ''),
                status: dados[mapeamentoColunas['Status']],
                tipo: dados[mapeamentoColunas['Tipos de Anúncios']],
                idProduto: dados[mapeamentoColunas['ID do produto']],
                segmentacaoPublico: dados[mapeamentoColunas['Segmentação de Público']],
                criativo: dados[mapeamentoColunas['Criativo']],
                metodoLance: dados[mapeamentoColunas['Método de Lance']],
                posicionamento: dados[mapeamentoColunas['Posicionamento']],
                dataInicio: dados[mapeamentoColunas['Data de Início']],
                dataFim: dados[mapeamentoColunas['Data de Encerramento']],
                impressoes,
                cliques,
                ctr,
                conversoes,
                conversoesDiretas,
                taxaConversao,
                taxaConversaoDireta,
                custoPorConversao: parseFloat(dados[mapeamentoColunas['Custo por Conversão']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                custoPorConversaoDireta: parseFloat(dados[mapeamentoColunas['Custo por Conversão Direta']]?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                itensVendidos,
                itensVendidosDiretos,
                gmv,
                receitaDireta,
                despesas,
                roas,
                roasDireto,
                acos: dados[mapeamentoColunas['ACOS']],
                acosDireto: dados[mapeamentoColunas['ACOS Direto']],
                impressoesProduto: parseInt(dados[mapeamentoColunas['Impressões do Produto']]) || 0,
                cliquesProdutos: parseInt(dados[mapeamentoColunas['Cliques de Produtos']]) || 0,
                ctrProduto: dados[mapeamentoColunas['CTR do Produto']]
              });
            }
          }
        } catch (error) {
          console.error('❌ Erro ao processar linha do anúncio:', error);
        }
      }
    }
    
    console.log(`📊 Processados ${anuncios.length} anúncios`);
    console.log('🏪 Dados da loja:', dadosLoja);
    
    return { dadosLoja, anuncios };
  } catch (error) {
    console.error('❌ Erro ao processar CSV:', error);
    throw new Error('Erro ao processar arquivo CSV');
  }
}

// Função para gerar insights do CSV
function gerarInsightsCSV(dadosProcessados) {
  const { dadosLoja, anuncios } = dadosProcessados;
  
  // Calcular métricas gerais
  const anunciosAtivos = anuncios.filter(a => a.status === 'Em Andamento');
  const anunciosPausados = anuncios.filter(a => a.status === 'Pausado');
  const anunciosEncerrados = anuncios.filter(a => a.status === 'Encerrado');
  
  const totalImpressoes = anuncios.reduce((acc, a) => acc + a.impressoes, 0);
  const totalCliques = anuncios.reduce((acc, a) => acc + a.cliques, 0);
  const totalConversoes = anuncios.reduce((acc, a) => acc + a.conversoes, 0);
  const totalDespesas = anuncios.reduce((acc, a) => acc + a.despesas, 0);
  const totalGMV = anuncios.reduce((acc, a) => acc + a.gmv, 0);
  const totalItensVendidos = anuncios.reduce((acc, a) => acc + a.itensVendidos, 0);
  
  const ctrMedio = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : '0.00';
  const taxaConversaoMedia = totalCliques > 0 ? ((totalConversoes / totalCliques) * 100).toFixed(2) : '0.00';
  const roasGeral = totalDespesas > 0 ? (totalGMV / totalDespesas).toFixed(2) : '0.00';
  const cpaMedio = totalConversoes > 0 ? (totalDespesas / totalConversoes).toFixed(2) : '0.00';
  
  // Top 5 anúncios por performance
  const top5ROAS = [...anuncios]
    .filter(a => a.roas > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5);
    
  const top5GMV = [...anuncios]
    .filter(a => a.gmv > 0)
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);
    
  const anunciosComProblemas = anuncios.filter(a => 
    a.status === 'Em Andamento' && 
    (a.roas < 3 || a.conversoes === 0 || parseFloat(a.ctr.replace('%', '')) < 1)
  );
  
  return {
    resumoGeral: {
      totalAnuncios: anuncios.length,
      anunciosAtivos: anunciosAtivos.length,
      anunciosPausados: anunciosPausados.length,
      anunciosEncerrados: anunciosEncerrados.length,
      totalImpressoes,
      totalCliques,
      totalConversoes,
      totalDespesas,
      totalGMV,
      totalItensVendidos,
      ctrMedio,
      taxaConversaoMedia,
      roasGeral,
      cpaMedio
    },
    topPerformers: {
      top5ROAS,
      top5GMV
    },
    problemasIdentificados: anunciosComProblemas,
    dadosLoja
  };
}

// ===== NOVAS FUNÇÕES PARA ANÁLISE DE CONTA VIA CSV =====

// Função para processar múltiplos CSVs de análise de conta
function processarCSVAnaliseContaCompleta(csvFiles) {
  try {
    console.log('📊 Iniciando processamento completo de análise de conta via CSV...');
    
    let dadosCompletos = {
      estatisticasLoja: null,
      detalhesProdutos: [],
      visaoGeralProdutos: [],
      dadosAnuncios: null,
      resumoConsolidado: {}
    };

    // Processar cada arquivo CSV
    csvFiles.forEach((arquivo, index) => {
      console.log(`📄 Processando arquivo ${index + 1}: ${arquivo.nome || 'arquivo'}`);
      
      if (arquivo.nome && arquivo.nome.includes('shop-stats')) {
        // Arquivo de estatísticas da loja
        dadosCompletos.estatisticasLoja = processarCSVEstatisticasLoja(arquivo.conteudo);
      } else if (arquivo.nome && arquivo.nome.includes('parentskudetail')) {
        // Arquivo de detalhes dos produtos
        dadosCompletos.detalhesProdutos = processarCSVDetalhesProdutos(arquivo.conteudo);
      } else if (arquivo.nome && arquivo.nome.includes('productoverview')) {
        // Arquivo de visão geral dos produtos
        dadosCompletos.visaoGeralProdutos = processarCSVVisaoGeralProdutos(arquivo.conteudo);
      } else if (arquivo.nome && arquivo.nome.includes('Anúncios')) {
        // Arquivo de dados de anúncios (reutilizar função existente)
        dadosCompletos.dadosAnuncios = processarCSVAnuncios(arquivo.conteudo);
      }
    });

    // Consolidar dados
    dadosCompletos.resumoConsolidado = consolidarDadosAnalise(dadosCompletos);
    
    return dadosCompletos;
  } catch (error) {
    console.error('❌ Erro ao processar CSVs de análise de conta:', error);
    throw new Error('Erro ao processar arquivos CSV para análise de conta');
  }
}

// Função para processar CSV de estatísticas da loja (shop-stats)
function processarCSVEstatisticasLoja(csvContent) {
  try {
    console.log('📊 Processando estatísticas da loja...');
    const linhas = csvContent.split('\n');
    const estatisticas = [];
    let resumoMensal = {};
    
    // Primeira linha com dados do período completo
    if (linhas.length > 1 && linhas[1]) {
      const dadosMensais = parseCSVLine(linhas[1]);
      if (dadosMensais.length >= 7) { // Reduzido para aceitar CSVs com menos campos
                  resumoMensal = {
          periodo: dadosMensais[0].replace(/"/g, ''),
          vendas: parseFloat(dadosMensais[1].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
          pedidos: parseInt(dadosMensais[2].replace(/[^\d]/g, '')) || 0,
          vendasPorPedido: parseFloat(dadosMensais[3].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          cliquesPorProduto: parseInt(dadosMensais[4] ? dadosMensais[4].replace(/[^\d]/g, '') : '0') || 0,
          visitantes: parseInt(dadosMensais[5].replace(/[^\d]/g, '')) || 0,
          taxaConversao: parseFloat(dadosMensais[6].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          pedidosCancelados: parseInt((dadosMensais[7] || '0').replace(/[^\d]/g, '')) || 0,
          vendasCanceladas: parseFloat((dadosMensais[8] || '0').replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
          pedidosDevolvidos: parseInt((dadosMensais[9] || '0').replace(/[^\d]/g, '')) || 0,
          vendasDevolvidas: parseFloat((dadosMensais[10] || '0').replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
          numeroCompradores: parseInt((dadosMensais[11] || '0').replace(/[^\d]/g, '')) || 0,
          novosCompradores: parseInt((dadosMensais[12] || '0').replace(/[^\d]/g, '')) || 0,
          compradoresExistentes: parseInt((dadosMensais[13] || '0').replace(/[^\d]/g, '')) || 0,
          compradoresPotenciais: parseInt((dadosMensais[14] || '0').replace(/[^\d]/g, '')) || 0,
          indiceRecompra: parseFloat((dadosMensais[15] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0
        };
      }
    }
    
    // Processar dados diários (a partir da linha 5)
    for (let i = 4; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha && !linha.startsWith('"Data"') && linha !== '""') {
        const dados = parseCSVLine(linha);
        if (dados.length >= 16 && dados[0] !== '""') {
          estatisticas.push({
            data: dados[0].replace(/"/g, ''),
            vendas: parseFloat(dados[1].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            pedidos: parseInt(dados[2].replace(/[^\d]/g, '')) || 0,
            vendasPorPedido: parseFloat(dados[3].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            cliquesPorProduto: parseInt(dados[4].replace(/[^\d]/g, '')) || 0,
            visitantes: parseInt(dados[5].replace(/[^\d]/g, '')) || 0,
            taxaConversao: parseFloat(dados[6].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            pedidosCancelados: parseInt(dados[7].replace(/[^\d]/g, '')) || 0,
            vendasCanceladas: parseFloat(dados[8].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            pedidosDevolvidos: parseInt(dados[9].replace(/[^\d]/g, '')) || 0,
            vendasDevolvidas: parseFloat(dados[10].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            numeroCompradores: parseInt(dados[11].replace(/[^\d]/g, '')) || 0,
            novosCompradores: parseInt(dados[12].replace(/[^\d]/g, '')) || 0,
            compradoresExistentes: parseInt(dados[13].replace(/[^\d]/g, '')) || 0,
            compradoresPotenciais: parseInt(dados[14].replace(/[^\d]/g, '')) || 0,
            indiceRecompra: parseFloat(dados[15].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
          });
        }
      }
    }
    
    console.log(`📊 Processados ${estatisticas.length} dias de estatísticas`);
    return { resumoMensal, estatisticasDiarias: estatisticas };
  } catch (error) {
    console.error('❌ Erro ao processar estatísticas da loja:', error);
    throw error;
  }
}

// Função para processar CSV de detalhes dos produtos (parentskudetail)
function processarCSVDetalhesProdutos(csvContent) {
  try {
    console.log('📊 Processando detalhes dos produtos...');
    const linhas = csvContent.split('\n');
    const produtos = [];
    
    // Processar a partir da linha 2 (primeira linha é cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha && linha !== '""') {
        const dados = parseCSVLine(linha);
        if (dados.length >= 27) {
          produtos.push({
            idItem: dados[0].replace(/"/g, ''),
            nomeProduto: dados[1].replace(/"/g, ''),
            statusItem: dados[2].replace(/"/g, ''),
            idVariacao: dados[3].replace(/"/g, ''),
            nomeVariacao: dados[4].replace(/"/g, ''),
            statusVariacao: dados[5].replace(/"/g, ''),
            skuVariacao: dados[6].replace(/"/g, ''),
            skuPrincipal: dados[7].replace(/"/g, ''),
            visitantesProduto: parseInt(dados[8].replace(/[^\d]/g, '')) || 0,
            visualizacoesPagina: parseInt(dados[9].replace(/[^\d]/g, '')) || 0,
            visitantesSairam: parseInt(dados[10].replace(/[^\d]/g, '')) || 0,
            taxaRejeicao: parseFloat(dados[11].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            cliquesBusca: parseInt(dados[12].replace(/[^\d]/g, '')) || 0,
            curtidas: parseInt(dados[13].replace(/[^\d]/g, '')) || 0,
            visitantesCarrinho: parseInt(dados[14].replace(/[^\d]/g, '')) || 0,
            unidadesCarrinho: parseInt(dados[15].replace(/[^\d]/g, '')) || 0,
            taxaConversaoCarrinho: parseFloat(dados[16].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            compradoresPedido: parseInt(dados[17].replace(/[^\d]/g, '')) || 0,
            unidadesPedido: parseInt(dados[18].replace(/[^\d]/g, '')) || 0,
            vendasPedido: parseFloat(dados[19].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            taxaConversaoPedido: parseFloat(dados[20].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            compradoresPago: parseInt(dados[21].replace(/[^\d]/g, '')) || 0,
            unidadesPago: parseInt(dados[22].replace(/[^\d]/g, '')) || 0,
            vendasPago: parseFloat(dados[23].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            taxaConversaoPago: parseFloat(dados[24].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            taxaRepeticaoPedido: parseFloat(dados[25].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            mediaDiasRepetir: parseFloat(dados[26].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
          });
        }
      }
    }
    
    console.log(`📊 Processados ${produtos.length} produtos detalhados`);
    return produtos;
  } catch (error) {
    console.error('❌ Erro ao processar detalhes dos produtos:', error);
    throw error;
  }
}

// Função para processar CSV de visão geral dos produtos (productoverview)
function processarCSVVisaoGeralProdutos(csvContent) {
  try {
    console.log('📊 Processando visão geral dos produtos...');
    const linhas = csvContent.split('\n');
    const visaoGeral = [];
    
    // Processar a partir da linha 2 (primeira linha é cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha && linha !== '""') {
        const dados = parseCSVLine(linha);
        if (dados.length >= 21) {
          visaoGeral.push({
            data: dados[0].replace(/"/g, ''),
            visitantesProduto: parseInt(dados[1].replace(/[^\d]/g, '')) || 0,
            visualizacoesPagina: parseInt(dados[2].replace(/[^\d]/g, '')) || 0,
            itensVisitados: parseInt(dados[3].replace(/[^\d]/g, '')) || 0,
            visitantesSairam: parseInt(dados[4].replace(/[^\d]/g, '')) || 0,
            taxaRejeicao: parseFloat(dados[5].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            cliquesBusca: parseInt(dados[6].replace(/[^\d]/g, '')) || 0,
            curtidas: parseInt(dados[7].replace(/[^\d]/g, '')) || 0,
            visitantesCarrinho: parseInt(dados[8].replace(/[^\d]/g, '')) || 0,
            unidadesCarrinho: parseInt(dados[9].replace(/[^\d]/g, '')) || 0,
            taxaConversaoCarrinho: parseFloat(dados[10].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            compradoresPedido: parseInt(dados[11].replace(/[^\d]/g, '')) || 0,
            unidadesPedido: parseInt(dados[12].replace(/[^\d]/g, '')) || 0,
            produtosPedidos: parseInt(dados[13].replace(/[^\d]/g, '')) || 0,
            vendasPedido: parseFloat(dados[14].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            taxaConversaoPedido: parseFloat(dados[15].replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            compradoresPago: parseInt(dados[16].replace(/[^\d]/g, '')) || 0,
            unidadesPago: parseInt(dados[17].replace(/[^\d]/g, '')) || 0,
            itensPagos: parseInt(dados[18].replace(/[^\d]/g, '')) || 0,
            vendasPago: parseFloat(dados[19].replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || 0,
            taxaConversaoPago: parseFloat(dados[20].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
          });
        }
      }
    }
    
    console.log(`📊 Processados ${visaoGeral.length} dias de visão geral dos produtos`);
    return visaoGeral;
  } catch (error) {
    console.error('❌ Erro ao processar visão geral dos produtos:', error);
    throw error;
  }
}

// Função para consolidar todos os dados de análise
function consolidarDadosAnalise(dadosCompletos) {
  try {
    console.log('📊 Consolidando dados de análise...');
    
    const resumo = {
      periodoAnalise: null,
      metricas: {
        visitantes: 0,
        gmv: 0,
        pedidosPagos: 0,
        taxaConversao: 0,
        ticketMedio: 0,
        investimentoAds: 0,
        roas: 0,
        cpa: 0
      },
      topProdutos: {
        porVisitantes: [],
        porVisualizacoes: [],
        porVendas: [],
        porTaxaConversao: [],
        porCarrinho: []
      },
      tendencias: {
        vendas: [],
        visitantes: [],
        conversao: []
      },
      campanhasAds: {
        totalCampanhas: 0,
        ativas: 0,
        pausadas: 0,
        roasMedio: 0,
        investimentoTotal: 0
      }
    };

    // Consolidar dados da loja
    if (dadosCompletos.estatisticasLoja && dadosCompletos.estatisticasLoja.resumoMensal) {
      const stats = dadosCompletos.estatisticasLoja.resumoMensal;
      resumo.periodoAnalise = stats.periodo;
      resumo.metricas.visitantes = stats.visitantes;
      resumo.metricas.gmv = stats.vendas;
      resumo.metricas.pedidosPagos = stats.pedidos;
      resumo.metricas.taxaConversao = stats.taxaConversao;
      resumo.metricas.ticketMedio = stats.vendasPorPedido;
    }

    // Consolidar dados de produtos
    if (dadosCompletos.detalhesProdutos && dadosCompletos.detalhesProdutos.length > 0) {
      // Top 5 produtos por visitantes
      resumo.topProdutos.porVisitantes = dadosCompletos.detalhesProdutos
        .filter(p => p && p.visitantesProduto > 0)
        .sort((a, b) => (b.visitantesProduto || 0) - (a.visitantesProduto || 0))
        .slice(0, 5)
        .map(p => ({
          nome: p.nomeProduto || 'Produto sem nome',
          visitantes: p.visitantesProduto || 0,
          visualizacoes: p.visualizacoesPagina || 0
        }));

      // Top 5 produtos por visualizações
      resumo.topProdutos.porVisualizacoes = dadosCompletos.detalhesProdutos
        .filter(p => p && p.visualizacoesPagina > 0)
        .sort((a, b) => (b.visualizacoesPagina || 0) - (a.visualizacoesPagina || 0))
        .slice(0, 5)
        .map(p => ({
          nome: p.nomeProduto || 'Produto sem nome',
          visualizacoes: p.visualizacoesPagina || 0,
          taxaConversao: p.taxaConversaoPago || 0
        }));

      // Top 5 produtos por vendas
      resumo.topProdutos.porVendas = dadosCompletos.detalhesProdutos
        .filter(p => p && p.vendasPago > 0)
        .sort((a, b) => (b.vendasPago || 0) - (a.vendasPago || 0))
        .slice(0, 5)
        .map(p => ({
          nome: p.nomeProduto || 'Produto sem nome',
          vendas: p.vendasPago || 0,
          unidades: p.unidadesPago || 0
        }));

      // Top 5 produtos por taxa de conversão
      resumo.topProdutos.porTaxaConversao = dadosCompletos.detalhesProdutos
        .filter(p => p && p.taxaConversaoPago > 0)
        .sort((a, b) => (b.taxaConversaoPago || 0) - (a.taxaConversaoPago || 0))
        .slice(0, 5)
        .map(p => ({
          nome: p.nomeProduto || 'Produto sem nome',
          taxaConversao: p.taxaConversaoPago || 0,
          unidades: p.unidadesPago || 0
        }));

      // Top 5 produtos por adições ao carrinho
      resumo.topProdutos.porCarrinho = dadosCompletos.detalhesProdutos
        .filter(p => p && p.visitantesCarrinho > 0)
        .sort((a, b) => (b.visitantesCarrinho || 0) - (a.visitantesCarrinho || 0))
        .slice(0, 5)
        .map(p => ({
          nome: p.nomeProduto || 'Produto sem nome',
          visitantesCarrinho: p.visitantesCarrinho || 0,
          unidadesCarrinho: p.unidadesCarrinho || 0
        }));
    }

    // Consolidar dados de campanhas (se disponível)
    if (dadosCompletos.dadosAnuncios && dadosCompletos.dadosAnuncios.anuncios) {
      const anuncios = dadosCompletos.dadosAnuncios.anuncios;
      resumo.campanhasAds.totalCampanhas = anuncios.length;
      resumo.campanhasAds.ativas = anuncios.filter(a => a.status === 'Em Andamento').length;
      resumo.campanhasAds.pausadas = anuncios.filter(a => a.status === 'Pausado').length;
      resumo.campanhasAds.investimentoTotal = anuncios.reduce((acc, a) => acc + a.despesas, 0);
      
      const roasTotal = anuncios.reduce((acc, a) => acc + a.roas, 0);
      resumo.campanhasAds.roasMedio = anuncios.length > 0 ? (roasTotal / anuncios.length).toFixed(2) : 0;
      
      // Atualizar métricas principais com dados de Ads
      resumo.metricas.investimentoAds = resumo.campanhasAds.investimentoTotal;
      resumo.metricas.roas = resumo.campanhasAds.roasMedio;
      resumo.metricas.cpa = resumo.metricas.pedidosPagos > 0 ? 
        (resumo.campanhasAds.investimentoTotal / resumo.metricas.pedidosPagos).toFixed(2) : 0;
    }

    // Calcular tendências (últimos 7 dias)
    if (dadosCompletos.estatisticasLoja && dadosCompletos.estatisticasLoja.estatisticasDiarias) {
      const ultimosDias = dadosCompletos.estatisticasLoja.estatisticasDiarias.slice(-7);
      resumo.tendencias.vendas = ultimosDias.map(d => ({ data: d.data, valor: d.vendas }));
      resumo.tendencias.visitantes = ultimosDias.map(d => ({ data: d.data, valor: d.visitantes }));
      resumo.tendencias.conversao = ultimosDias.map(d => ({ data: d.data, valor: d.taxaConversao }));
    }

    console.log('✅ Dados consolidados com sucesso');
    return resumo;
  } catch (error) {
    console.error('❌ Erro ao consolidar dados:', error);
    throw error;
  }
}

// Função auxiliar para fazer parse de linha CSV considerando aspas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

module.exports = {
  processarCSVAnuncios,
  gerarInsightsCSV,
  // Novas funções para análise de conta
  processarCSVAnaliseContaCompleta,
  processarCSVEstatisticasLoja,
  processarCSVDetalhesProdutos,
  processarCSVVisaoGeralProdutos,
  consolidarDadosAnalise
};