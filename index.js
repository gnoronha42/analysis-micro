require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT, EXPRESS_ACCOUNT_ANALYSIS } = require('./analysis');
const { processarComparacao } = require('./comparison');

const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));



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
        max_tokens: 6000,
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
          body: JSON.stringify(requestBody),
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
    const { images, analysisType, clientName, ocrTexts = [] } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Imagens são obrigatórias" });
    }
    if (!analysisType || !["ads", "account", "express"].includes(analysisType)) {
      return res.status(400).json({ error: "Tipo de análise inválido" });
    }

    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    const basePrompt =
      analysisType === "ads"
        ? `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
        : analysisType === "account"
          ? `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
          : `${EXPRESS_ACCOUNT_ANALYSIS}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

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

    res.json({
      analysis: markdownFinal,
      analysisType,
      clientName: clientName || "Cliente",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Erro interno do servidor",
      details: "Falha na geração da análise",
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Microserviço de análise rodando na porta ${PORT}`);
});
