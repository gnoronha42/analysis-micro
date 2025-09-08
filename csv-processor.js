// Função para processar CSV de anúncios
function processarCSVAnuncios(csvContent) {
  console.log('📊 Iniciando processamento de CSV de anúncios...');
  
  try {
    const linhas = csvContent.split('\n');
    const dadosLoja = {};
    const anuncios = [];
    
    // Processar metadados da loja (primeiras linhas)
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      
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
      } else if (linha.startsWith('#,Nome do Anúncio,')) {
        // Cabeçalho encontrado, processar anúncios a partir da próxima linha
        for (let j = i + 1; j < linhas.length; j++) {
          const linhaAnuncio = linhas[j].trim();
          if (linhaAnuncio && !linhaAnuncio.startsWith(',')) {
            const dados = linhaAnuncio.split(',');
            if (dados.length >= 24) { // Verificar se tem dados suficientes
              anuncios.push({
                numero: dados[0],
                nome: dados[1]?.replace(/"/g, ''),
                status: dados[2],
                tipo: dados[3],
                idProduto: dados[4],
                criativo: dados[5],
                metodoLance: dados[6],
                posicionamento: dados[7],
                dataInicio: dados[8],
                dataFim: dados[9],
                impressoes: parseInt(dados[10]) || 0,
                cliques: parseInt(dados[11]) || 0,
                ctr: dados[12],
                conversoes: parseInt(dados[13]) || 0,
                conversoesDiretas: parseInt(dados[14]) || 0,
                taxaConversao: dados[15],
                taxaConversaoDireta: dados[16],
                custoPorConversao: parseFloat(dados[17]) || 0,
                custoPorConversaoDireta: parseFloat(dados[18]) || 0,
                itensVendidos: parseInt(dados[19]) || 0,
                itensVendidosDiretos: parseInt(dados[20]) || 0,
                gmv: parseFloat(dados[21]) || 0,
                receitaDireta: parseFloat(dados[22]) || 0,
                despesas: parseFloat(dados[23]) || 0,
                roas: parseFloat(dados[24]) || 0,
                roasDireto: parseFloat(dados[25]) || 0,
                acos: dados[26],
                acosDireto: dados[27]
              });
            }
          }
        }
        break;
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
  
  const ctrMedio = totalCliques > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : '0.00';
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

module.exports = {
  processarCSVAnuncios,
  gerarInsightsCSV
};
