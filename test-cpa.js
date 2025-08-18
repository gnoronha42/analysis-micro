// Script de teste para a função calcularCPA
const { calcularCPA } = require('./index.js');

// Teste com dados reais do problema
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

console.log('🧪 Testando função calcularCPA...');
console.log('📝 Markdown original:');
console.log(testMarkdown);
console.log('\n' + '='.repeat(50) + '\n');

try {
  const resultado = calcularCPA(testMarkdown);
  
  console.log('✅ Resultado após cálculo do CPA:');
  console.log(resultado);
  
  // Verificar se o CPA foi calculado
  const cpaEncontrado = resultado.match(/R\$\s*[\d.,]+/g);
  console.log('\n🔍 CPAs encontrados:', cpaEncontrado);
  
  // CPA esperado: R$3.955,50 ÷ 3 = R$1.318,50
  const cpaEsperado = 'R$1.318,50';
  if (resultado.includes(cpaEsperado)) {
    console.log('✅ CPA calculado corretamente:', cpaEsperado);
  } else {
    console.log('❌ CPA não foi calculado corretamente');
    console.log('Esperado:', cpaEsperado);
  }
  
} catch (error) {
  console.error('❌ Erro ao testar:', error);
} 