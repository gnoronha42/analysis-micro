const { shopeeFetch } = require('./shopee-client');

const PEDIDOS_PAGOS_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'TO_CONFIRM_RECEIVE', 'TO_SHIP', 'TO_CONFIRM_DELIVER', 'READY_TO_PICKUP', 'TO_RETURN', 'CANCELLED'];
const PEDIDOS_NAO_PAGOS_STATUSES = ['UNPAID', 'CANCELLED', 'TO_RETURN', 'REFUND'];

async function calcularPedidosPagos30Dias(access_token, shop_id, timeFrom, timeTo) {
  let finalTimeFrom;
  let finalTimeTo;
  let dataInicio;
  let dataFim;

  if (timeFrom && timeTo) {
    finalTimeFrom = timeFrom;
    finalTimeTo = timeTo;
    dataInicio = new Date(timeFrom * 1000);
    dataFim = new Date(timeTo * 1000);
  } else {
    const now = new Date();
    dataFim = new Date(now.setHours(23, 59, 59, 999));
    dataInicio = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    dataInicio.setHours(0, 0, 0, 0);
    finalTimeFrom = Math.floor(dataInicio.getTime() / 1000);
    finalTimeTo = Math.floor(dataFim.getTime() / 1000);
  }

  console.log(`\n [MICRO-SERVICE] Calculando vendas: ${dataInicio.toISOString().split('T')[0]} até ${dataFim.toISOString().split('T')[0]}`);

  // Dividir período em chunks de 14 dias
  const LOOKBACK_DAYS = 15;
  const fetchStartTime = finalTimeFrom - (LOOKBACK_DAYS * 24 * 60 * 60);
  const CHUNK_DAYS = 14;
  const CHUNK_SECONDS = CHUNK_DAYS * 24 * 60 * 60;
  const chunks = [];

  let currentStart = fetchStartTime;
  while (currentStart < finalTimeTo) {
    const currentEnd = Math.min(currentStart + CHUNK_SECONDS, finalTimeTo);
    chunks.push({ start: currentStart, end: currentEnd });
    currentStart = currentEnd;
  }

  let totalVendas = 0;
  let pedidosProcessados = 0;
  const statusBreakdown = {};
  const productSalesMap = {};
  let totalPedidosPagos = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`   Chunk ${chunkIndex + 1}/${chunks.length}...`);

    let cursor = "";
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      try {
        pageCount++;
        const params = {
          time_range_field: 'create_time',
          time_from: chunk.start,
          time_to: chunk.end,
          page_size: 100,
          response_optional_fields: 'order_status',
          ...(cursor ? { cursor } : {})
        };

        const orderResp = await shopeeFetch({
          path: '/api/v2/order/get_order_list',
          access_token,
          shop_id,
          query: params,
        });

        const pageOrders = orderResp?.response?.order_list || [];
        
        // FILTRAGEM OTIMIZADA: Apenas status relevantes
        const relevantOrders = pageOrders.filter((o) => {
          if (!o.order_status) return true;
          return PEDIDOS_PAGOS_STATUSES.includes(o.order_status);
        });

        if (relevantOrders.length > 0) {
          const orderSns = relevantOrders.map((o) => o.order_sn);
          
          // Processamento em batches
          const chunkSize = 20; 
          const results = [];
          
          for (let i = 0; i < orderSns.length; i += chunkSize) {
            const snChunk = orderSns.slice(i, i + chunkSize);
            const batchPromise = shopeeFetch({
              path: '/api/v2/order/get_order_detail',
              access_token,
              shop_id,
              query: {
                order_sn_list: snChunk.join(','),
                response_optional_fields: 'total_amount,order_status,create_time,pay_time,item_list'
              }
            }).then(res => res?.response?.order_list || []).catch(() => []);
            
            results.push(batchPromise);
          }
          
          // Executar batches em paralelo (limitado pelo loop, mas aqui podemos usar Promise.all)
          const detailsChunks = await Promise.all(results);
          const details = detailsChunks.flat();

          for (const order of details) {
            const status = order.order_status || 'UNKNOWN';
            const amount = Number(order.total_amount || 0);
            
            let orderTime = order.pay_time;
            if (status === 'CANCELLED') {
              if (!order.pay_time) continue; 
            } else {
              orderTime = order.pay_time || order.create_time;
            }

            if (!orderTime) continue;

            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            pedidosProcessados++;

            if (
              PEDIDOS_PAGOS_STATUSES.includes(status) &&
              orderTime >= finalTimeFrom &&
              orderTime <= finalTimeTo
            ) {
              totalPedidosPagos++;
              totalVendas += amount;

              if (order.item_list) {
                order.item_list.forEach((item) => {
                  const itemId = String(item.item_id);
                  const itemName = item.item_name;
                  const quantity = item.model_quantity_purchased || 0;
                  const price = Number(item.model_discounted_price || 0);
                  const revenue = price * quantity;

                  if (!productSalesMap[itemId]) {
                    productSalesMap[itemId] = { name: itemName, sales: 0, revenue: 0 };
                  }
                  productSalesMap[itemId].sales += quantity;
                  productSalesMap[itemId].revenue += revenue;
                });
              }
            }
          }
        }

        const nextCursor = orderResp?.response?.next_cursor || "";
        cursor = nextCursor;
        hasMore = orderResp?.response?.more && !!cursor;

      } catch (error) {
        console.error(`Erro no chunk ${chunkIndex + 1}:`, error.message);
        hasMore = false;
      }
    }
  }

  const topProducts = Object.entries(productSalesMap)
    .map(([id, data]) => ({
      id: Number(id),
      name: data.name,
      sales: data.sales,
      revenue: data.revenue
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  return {
    totalVendas,
    totalPedidos: totalPedidosPagos,
    pedidosProcessados,
    statusBreakdown,
    periodo: {
      inicio: dataInicio.toISOString().split('T')[0],
      fim: dataFim.toISOString().split('T')[0]
    },
    topProducts
  };
}

module.exports = {
  calcularPedidosPagos30Dias,
  PEDIDOS_PAGOS_STATUSES,
  PEDIDOS_NAO_PAGOS_STATUSES
};
