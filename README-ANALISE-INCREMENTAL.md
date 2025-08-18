# Sistema de Análise Incremental - Shopee AI

## Visão Geral

Este sistema resolve o problema de análises repetitivas semanais, implementando um mecanismo de análise incremental que considera o histórico anterior para gerar ações complementares e não repetitivas.

## Como Funciona

### 1. **Análise com Histórico**
- O sistema busca análises anteriores do mesmo cliente
- Extrai ações já executadas da semana anterior
- Gera novas ações baseadas na evolução dos KPIs
- Evita repetição de estratégias já implementadas

### 2. **Evolução de KPIs**
- Compara métricas entre análises consecutivas
- Identifica tendências (crescimento/queda)
- Propõe ações corretivas ou de escala
- Foca em evolução contínua

## Endpoints Disponíveis

### Frontend → Backend (Next.js)
```typescript
// Buscar histórico de análises express
GET /api/analises?clientId=123&type=express

// Buscar análise específica para comparação
DELETE /api/analises?clientId=123&analysisId=456
```

### Backend → Microserviço
```typescript
// Análise express com histórico
POST /analise-express-com-historico
{
  "images": ["base64..."],
  "analysisType": "express",
  "clientName": "Nome do Cliente",
  "historicoAnterior": { /* dados do histórico */ },
  "ultimaAnalise": { /* última análise */ }
}
```

## Fluxo de Funcionamento

### Semana 1 (Primeira Análise)
1. Cliente envia prints da Shopee
2. Sistema gera análise inicial sem histórico
3. Salva análise no banco de dados
4. Retorna plano de ação para a semana

### Semana 2 (Análise Incremental)
1. Cliente envia novos prints
2. Sistema busca análise da semana anterior
3. Extrai ações já executadas
4. Analisa evolução dos KPIs
5. Gera NOVAS ações (não repetitivas)
6. Salva nova análise com metadados de histórico

### Semana 3+ (Análise Evolutiva)
1. Sistema considera todo o histórico disponível
2. Identifica padrões de sucesso/falha
3. Propõe ações baseadas em tendências
4. Mantém consistência estratégica

## Estrutura de Dados

### Histórico de Análises
```typescript
interface HistoricoAnalise {
  historico: Array<{
    id: string;
    title: string;
    created_at: Date;
    content: string;
    results_count: number;
  }>;
  ultimaAnalise: Analise | null;
  analiseAnterior: Analise | null;
  totalAnalises: number;
  evolucaoDisponivel: boolean;
}
```

### Metadados de Evolução
```typescript
interface EvolucaoKpis {
  visitantes: {
    anterior: number;
    atual: number;
    variacao: string;
  } | null;
  conversao: { /* similar */ } | null;
  gmv: { /* similar */ } | null;
  roas: { /* similar */ } | null;
  ticketMedio: { /* similar */ } | null;
}
```

## Exemplo de Uso no Frontend

```typescript
// 1. Buscar histórico antes de gerar nova análise
const historico = await fetch(`/api/analises?clientId=${clientId}&type=express`, {
  method: 'HEAD'
}).then(res => res.json());

// 2. Gerar análise com histórico
const novaAnalise = await fetch('/analise-express-com-historico', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    images: uploadedImages,
    analysisType: 'express',
    clientName: clientName,
    historicoAnterior: historico.historico,
    ultimaAnalise: historico.ultimaAnalise
  })
}).then(res => res.json());

// 3. Salvar no banco via rota existente
await fetch('/api/analises', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: clientId,
    type: 'express',
    results: [{ analysis: novaAnalise.analysis }]
  })
});
```

## Benefícios

### ✅ **Elimina Repetição**
- Nenhuma ação é repetida sem justificativa técnica
- Foco em evolução e correção de problemas
- Estratégias complementares semanais

### ✅ **Análise Evolutiva**
- Considera tendências de KPIs
- Identifica padrões de sucesso
- Propõe ações baseadas em dados históricos

### ✅ **Consistência Estratégica**
- Mantém foco nos objetivos de longo prazo
- Ajusta estratégias baseado em resultados
- Evita mudanças bruscas sem fundamento

### ✅ **Eficiência Operacional**
- Reduz tempo de análise
- Foca em ações realmente necessárias
- Maximiza ROI das estratégias

## Regras de Negócio

### 🔒 **Obrigatório**
- Sempre verificar histórico antes de gerar nova análise
- NUNCA repetir ações da semana anterior
- SEMPRE analisar evolução dos KPIs
- FOCAR em correções ou escalas

### 🚫 **Proibido**
- Gerar análises sem considerar histórico
- Repetir ações sem justificativa técnica
- Ignorar tendências de KPIs
- Propor estratégias contraditórias

## Monitoramento e Manutenção

### 📊 **Métricas de Qualidade**
- Taxa de repetição de ações
- Evolução dos KPIs semanais
- Satisfação do usuário com análises
- Tempo de geração de análises

### 🔧 **Manutenção**
- Limpeza periódica do cache
- Otimização das queries de histórico
- Atualização dos prompts de IA
- Validação da qualidade das análises

## Troubleshooting

### Problema: Análise repetitiva
**Solução:** Verificar se o histórico está sendo passado corretamente para o microserviço

### Problema: Histórico não encontrado
**Solução:** Verificar se as rotas de histórico estão funcionando e se há dados no banco

### Problema: Performance lenta
**Solução:** Verificar cache e otimizar queries de histórico

## Próximos Passos

1. **Implementar no Frontend**: Usar as rotas criadas para buscar histórico
2. **Testar Fluxo Completo**: Validar análise incremental end-to-end
3. **Monitorar Qualidade**: Acompanhar redução de repetições
4. **Otimizar Prompts**: Refinar instruções baseado em resultados
5. **Expandir para Outros Tipos**: Aplicar lógica para análises de Ads e Conta 