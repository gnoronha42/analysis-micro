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

module.exports = {
  processarCSVAnuncios,
  gerarInsightsCSV
};