#!/usr/bin/env node

/**
 * Facebook Insights MCP Server
 *
 * Este servidor implementa o protocolo MCP (Model Context Protocol) para permitir
 * que modelos de linguagem acessem a API de Facebook Marketing Insights.
 *
 * Configuração:
 * - Defina as variáveis de ambiente FB_APP_ID, FB_APP_SECRET e FB_ACCESS_TOKEN
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const axios = require("axios");
const dotenv = require("dotenv");

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Facebook - lê de variáveis de ambiente
const fbConfig = {
  FB_APP_ID: process.env.FB_APP_ID || '',
  FB_APP_SECRET: process.env.FB_APP_SECRET || '',
  FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN || ''
};

// Verificar se as credenciais foram fornecidas
if (!fbConfig.FB_APP_ID || !fbConfig.FB_APP_SECRET || !fbConfig.FB_ACCESS_TOKEN) {
  console.error('⚠️ ATENÇÃO: Credenciais do Facebook não configuradas!');
  console.error('Configure as variáveis de ambiente FB_APP_ID, FB_APP_SECRET e FB_ACCESS_TOKEN');
  console.error('Exemplo: FB_APP_ID=seu_app_id FB_APP_SECRET=seu_app_secret FB_ACCESS_TOKEN=seu_token node index.js');
}

// Porta do servidor HTTP (usado apenas quando não estiver em modo STDIO)
const PORT = process.env.PORT || 8082;

// Esquemas de validação para parâmetros de entrada
const schemas = {
  toolInputs: {
    facebookListAdAccounts: z.object({
      fields: z.string().optional().default("id,name,account_id,account_status")
    }),

    facebookAccountInfo: z.object({
      accountId: z.string().describe("ID da conta do Facebook (formato: act_XXXXXXXXX)")
    }),

    facebookInsightsGet: z.object({
      accountId: z.string().describe("ID da conta do Facebook (formato: act_XXXXXXXXX)"),
      metrics: z.array(z.string()).describe("Lista de métricas a serem recuperadas (ex: impressions, clicks, spend)"),
      date_preset: z.string().optional().describe("Período de tempo predefinido (ex: today, yesterday, last_7d, last_30d)"),
      time_increment: z.number().optional().describe("Incremento de tempo em dias (1 = diário, 7 = semanal, 30 = mensal)")
    }),

    facebookCampaigns: z.object({
      accountId: z.string().describe("ID da conta do Facebook (formato: act_XXXXXXXXX)"),
      status: z.string().optional().describe("Status das campanhas a serem recuperadas (ACTIVE, PAUSED, ARCHIVED, ALL)")
    }),

    facebookAdsets: z.object({
      accountId: z.string().describe("ID da conta do Facebook (formato: act_XXXXXXXXX)"),
      campaignId: z.string().optional().describe("ID da campanha"),
      status: z.string().optional().describe("Status dos conjuntos de anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)")
    }),

    facebookAds: z.object({
      accountId: z.string().describe("ID da conta do Facebook (formato: act_XXXXXXXXX)"),
      adsetId: z.string().optional().describe("ID do conjunto de anúncios"),
      status: z.string().optional().describe("Status dos anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)")
    }),

    facebookInsights: z.object({
      endpoint: z.string().describe("Endpoint da API do Facebook (ex: me/adaccounts, act_XXXXXXXXX/insights)"),
      method: z.enum(["GET", "POST"]).optional().describe("Método HTTP (GET, POST)"),
      queryParams: z.record(z.any()).optional().describe("Parâmetros de consulta para a API"),
      body: z.record(z.any()).optional().describe("Corpo da requisição para métodos POST")
    })
  }
};

// Definições de ferramentas
const TOOL_DEFINITIONS = [
  { 
    name: "facebook-list-ad-accounts", 
    description: "Lista todas as contas de anúncios do Facebook disponíveis para o usuário autenticado", 
    inputSchema: { 
      type: "object", 
      properties: {
        fields: {
          type: "string",
          description: "Campos a serem retornados na resposta",
          default: "id,name,account_id,account_status"
        }
      }, 
      required: [], 
      description: "Especifica os campos a serem incluídos na resposta. Por padrão, retorna id, nome, ID da conta e status da conta."
    }
  },
  {
    name: "facebook-account-info",
    description: "Obtém informações detalhadas sobre uma conta específica do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID da conta do Facebook (formato: act_XXXXXXXXX)"
        }
      },
      required: ["accountId"]
    }
  },
  {
    name: "facebook-insights-get",
    description: "Recupera dados de insights para uma conta específica do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID da conta do Facebook (formato: act_XXXXXXXXX)"
        },
        metrics: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Lista de métricas a serem recuperadas (ex: impressions, clicks, spend)"
        },
        date_preset: {
          type: "string",
          description: "Período de tempo predefinido (ex: today, yesterday, last_7d, last_30d)"
        },
        time_increment: {
          type: "number",
          description: "Incremento de tempo em dias (1 = diário, 7 = semanal, 30 = mensal)"
        }
      },
      required: ["accountId", "metrics"]
    }
  },
  {
    name: "facebook-campaigns",
    description: "Obtém campanhas para uma conta específica do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID da conta do Facebook (formato: act_XXXXXXXXX)"
        },
        status: {
          type: "string",
          description: "Status das campanhas a serem recuperadas (ACTIVE, PAUSED, ARCHIVED, ALL)"
        }
      },
      required: ["accountId"]
    }
  },
  {
    name: "facebook-adsets",
    description: "Obtém conjuntos de anúncios para uma campanha ou conta do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID da conta do Facebook (formato: act_XXXXXXXXX)"
        },
        campaignId: {
          type: "string",
          description: "ID da campanha"
        },
        status: {
          type: "string",
          description: "Status dos conjuntos de anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)"
        }
      },
      required: ["accountId"]
    }
  },
  {
    name: "facebook-ads",
    description: "Obtém anúncios para um conjunto de anúncios ou conta do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID da conta do Facebook (formato: act_XXXXXXXXX)"
        },
        adsetId: {
          type: "string",
          description: "ID do conjunto de anúncios"
        },
        status: {
          type: "string",
          description: "Status dos anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)"
        }
      },
      required: ["accountId"]
    }
  },
  {
    name: "facebook-insights",
    description: "Handler genérico para fazer chamadas personalizadas à API do Facebook",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "Endpoint da API do Facebook (ex: me/adaccounts, act_XXXXXXXXX/insights)"
        },
        method: {
          type: "string",
          enum: ["GET", "POST"],
          description: "Método HTTP (GET, POST)"
        },
        queryParams: {
          type: "object",
          description: "Parâmetros de consulta para a API"
        },
        body: {
          type: "object",
          description: "Corpo da requisição para métodos POST"
        }
      },
      required: ["endpoint"]
    }
  }
];

/**
 * Função utilitária para formatar respostas no padrão MCP
 * @param {string} text - Texto da resposta
 * @param {boolean} isError - Indica se é uma resposta de erro
 * @returns {Object} Resposta formatada no padrão MCP
 */
function formatMcpResponse(text, isError = false) {
  return {
    content: [{
      type: "text",
      text: text
    }],
    isError: isError
  };
}

/**
 * Função utilitária para tratar erros de forma consistente
 * @param {Error} error - Objeto de erro
 * @param {string} context - Contexto do erro
 * @returns {Object} Resposta de erro formatada no padrão MCP
 */
function handleError(error, context) {
  console.error(`Erro em ${context}:`, error);

  let errorMessage = error.message;

  // Verificar se é um erro da API do Facebook
  if (error.response && error.response.data) {
    console.error('Detalhes do erro da API:', error.response.data);
    if (error.response.data.error) {
      errorMessage = `Erro da API do Facebook: ${error.response.data.error.message} (código: ${error.response.data.error.code})`;
    }
  }

  return formatMcpResponse(`Erro: ${errorMessage}`, true);
}

/**
 * Função para fazer requisições à API do Facebook com tratamento de erros consistente
 * @param {string} endpoint - Endpoint da API
 * @param {string} method - Método HTTP
 * @param {Object} queryParams - Parâmetros de consulta
 * @param {Object} body - Corpo da requisição
 * @returns {Promise<Object>} Resposta da API
 */
async function facebookApiRequest(endpoint, method = 'GET', queryParams = {}, body = null) {
  try {
    // Verificar se as credenciais estão configuradas
    if (!fbConfig.FB_ACCESS_TOKEN) {
      throw new Error('Token de acesso do Facebook não configurado');
    }

    // Construir URL com parâmetros de consulta
    const baseUrl = 'https://graph.facebook.com/v22.0';
    const url = `${baseUrl}/${endpoint}`;

    // Adicionar token de acesso aos parâmetros de consulta
    const params = {
      access_token: fbConfig.FB_ACCESS_TOKEN,
      ...queryParams
    };

    console.error(`Fazendo requisição ${method} para ${url}`);
    console.error(`Parâmetros: ${JSON.stringify(params)}`);
    if (body) {
      console.error(`Corpo: ${JSON.stringify(body)}`);
    }

    // Fazer requisição à API do Facebook
    const response = await axios({
      method,
      url,
      params,
      data: body
    });

    console.error(`Resposta da API do Facebook: ${response.status}`);

    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('Erro na requisição à API do Facebook:', error.message);
    if (error.response) {
      console.error('Detalhes do erro:', error.response.data);
      return {
        status: error.response.status,
        error: error.response.data
      };
    }
    throw error;
  }
}

// Manipuladores de ferramentas
const toolHandlers = {
  // Lista todas as contas de anúncios disponíveis
  "facebook-list-ad-accounts": async (args) => {
    try {
      // Validar parâmetros de entrada
      schemas.toolInputs.facebookListAdAccounts.parse(args);

      console.error('Listando Contas de Anúncios do Facebook');

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest('me/adaccounts', 'GET', {
        fields: 'id,name,account_id,account_status'
      });

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao listar contas de anúncios: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      return formatMcpResponse(`Contas de anúncios encontradas: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-list-ad-accounts');
    }
  },

  // Obtém informações detalhadas sobre uma conta específica
  "facebook-account-info": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookAccountInfo.parse(args);

      console.error(`Obtendo informações da conta: ${parsed.accountId}`);

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(`${parsed.accountId}`, 'GET', {
        fields: 'id,name,account_id,account_status,currency,timezone_name,business_name,owner'
      });

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao obter informações da conta: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      return formatMcpResponse(`Informações da conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-account-info');
    }
  },

  // Recupera dados de insights para uma conta específica
  "facebook-insights-get": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookInsightsGet.parse(args);

      console.error(`Obtendo insights para a conta: ${parsed.accountId}`);
      console.error(`Métricas: ${parsed.metrics.join(', ')}`);

      // Construir parâmetros de consulta
      const queryParams = {
        fields: parsed.metrics.join(','),
        time_range: parsed.date_preset ? undefined : '{"since":"2023-01-01","until":"2023-12-31"}',
        date_preset: parsed.date_preset,
        time_increment: parsed.time_increment
      };

      // Remover parâmetros undefined
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(`${parsed.accountId}/insights`, 'GET', queryParams);

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao obter insights: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      return formatMcpResponse(`Insights para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-insights-get');
    }
  },

  // Obtém campanhas para uma conta específica
  "facebook-campaigns": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookCampaigns.parse(args);

      console.error(`Obtendo campanhas para a conta: ${parsed.accountId}`);
      if (parsed.status) {
        console.error(`Filtrando por status: ${parsed.status}`);
      }

      // Construir parâmetros de consulta
      const queryParams = {
        fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
        limit: 100
      };

      // Adicionar filtro de status se fornecido
      if (parsed.status && parsed.status !== 'ALL') {
        queryParams.filtering = JSON.stringify([{
          field: 'status',
          operator: 'EQUAL',
          value: parsed.status
        }]);
      }

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(`${parsed.accountId}/campaigns`, 'GET', queryParams);

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao obter campanhas: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      return formatMcpResponse(`Campanhas para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-campaigns');
    }
  },

  // Obtém conjuntos de anúncios para uma campanha ou conta
  "facebook-adsets": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookAdsets.parse(args);

      console.error(`Obtendo conjuntos de anúncios para a conta: ${parsed.accountId}`);
      if (parsed.campaignId) {
        console.error(`Filtrando por campanha: ${parsed.campaignId}`);
      }
      if (parsed.status) {
        console.error(`Filtrando por status: ${parsed.status}`);
      }

      // Determinar o endpoint com base nos parâmetros
      let endpoint = parsed.campaignId ?
        `${parsed.campaignId}/adsets` :
        `${parsed.accountId}/adsets`;

      // Construir parâmetros de consulta
      const queryParams = {
        fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal',
        limit: 100
      };

      // Adicionar filtro de status se fornecido
      if (parsed.status && parsed.status !== 'ALL') {
        queryParams.filtering = JSON.stringify([{
          field: 'status',
          operator: 'EQUAL',
          value: parsed.status
        }]);
      }

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(endpoint, 'GET', queryParams);

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao obter conjuntos de anúncios: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      const contextInfo = parsed.campaignId ?
        `campanha ${parsed.campaignId}` :
        `conta ${parsed.accountId}`;

      return formatMcpResponse(`Conjuntos de anúncios para a ${contextInfo}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-adsets');
    }
  },

  // Obtém anúncios para um conjunto de anúncios ou conta
  "facebook-ads": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookAds.parse(args);

      console.error(`Obtendo anúncios para a conta: ${parsed.accountId}`);
      if (parsed.adsetId) {
        console.error(`Filtrando por conjunto de anúncios: ${parsed.adsetId}`);
      }
      if (parsed.status) {
        console.error(`Filtrando por status: ${parsed.status}`);
      }

      // Determinar o endpoint com base nos parâmetros
      let endpoint = parsed.adsetId ?
        `${parsed.adsetId}/ads` :
        `${parsed.accountId}/ads`;

      // Construir parâmetros de consulta
      const queryParams = {
        fields: 'id,name,status,adset_id,creative{id,name,body,title,image_url}',
        limit: 100
      };

      // Adicionar filtro de status se fornecido
      if (parsed.status && parsed.status !== 'ALL') {
        queryParams.filtering = JSON.stringify([{
          field: 'status',
          operator: 'EQUAL',
          value: parsed.status
        }]);
      }

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(endpoint, 'GET', queryParams);

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro ao obter anúncios: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      const contextInfo = parsed.adsetId ?
        `conjunto de anúncios ${parsed.adsetId}` :
        `conta ${parsed.accountId}`;

      return formatMcpResponse(`Anúncios para o ${contextInfo}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-ads');
    }
  },

  // Handler genérico para fazer chamadas personalizadas à API do Facebook
  "facebook-insights": async (args) => {
    try {
      // Validar parâmetros de entrada
      const parsed = schemas.toolInputs.facebookInsights.parse(args);

      console.error(`Fazendo chamada personalizada para: ${parsed.endpoint}`);
      console.error(`Método: ${parsed.method || 'GET'}`);
      if (parsed.queryParams) {
        console.error(`Parâmetros: ${JSON.stringify(parsed.queryParams)}`);
      }
      if (parsed.body) {
        console.error(`Corpo: ${JSON.stringify(parsed.body)}`);
      }

      // Fazer requisição à API do Facebook
      const response = await facebookApiRequest(
        parsed.endpoint,
        parsed.method || 'GET',
        parsed.queryParams || {},
        parsed.body
      );

      // Verificar se houve erro na resposta
      if (response.error) {
        return formatMcpResponse(`Erro na chamada personalizada: ${JSON.stringify(response.error)}`, true);
      }

      // Formatar resposta
      return formatMcpResponse(`Resultado da chamada para ${parsed.endpoint}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      return handleError(error, 'facebook-insights');
    }
  }
};

// Criar servidor MCP
const server = new Server({
  name: "facebook-insights-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Configurar handler para listar ferramentas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Requisição de listagem de ferramentas recebida");
  // Retornar exatamente no formato esperado pelo MCP
  return { tools: TOOL_DEFINITIONS };
});

// Configurar handler para executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`Executando ferramenta: ${name}`);
  console.error(`Argumentos: ${JSON.stringify(args)}`);

  try {
    // Verificar se a ferramenta existe
    const handler = toolHandlers[name];
    if (!handler) {
      console.error(`Ferramenta não encontrada: ${name}`);
      return formatMcpResponse(`Erro: Ferramenta '${name}' não encontrada`, true);
    }

    // Executar a ferramenta e retornar o resultado
    const result = await handler(args || {});
    console.error(`Resultado: ${JSON.stringify(result)}`);

    // Garantir que o resultado esteja no formato correto
    if (!result.content || !Array.isArray(result.content)) {
      console.error("Resultado em formato incorreto, corrigindo...");
      return formatMcpResponse(JSON.stringify(result));
    }

    return result;
  } catch (error) {
    return handleError(error, `execução da ferramenta ${name}`);
  }
});

// Função para processar mensagens no formato n8n
function processN8nMessage(message) {
  // Verificar se é uma requisição no formato n8n
  if (message.type === 'listTools') {
    console.error('Recebida requisição listTools no formato n8n');

    // O n8n espera um array simples de ferramentas sem nenhum wrapper
    // Baseado no código do nó MCP Client, ele tenta processar a resposta de várias maneiras:
    // 1. Como um array direto
    // 2. Como um objeto com uma propriedade 'tools' que é um array
    // 3. Como um objeto com propriedades que são ferramentas
    // Vamos usar o formato mais simples: um array direto
    console.log(JSON.stringify(TOOL_DEFINITIONS));
    return;
  }

  if (message.type === 'callTool' && message.name) {
    console.error(`Recebida requisição callTool no formato n8n para: ${message.name}`);

    // Verificar se a ferramenta existe
    const handler = toolHandlers[message.name];
    if (!handler) {
      console.error(`Ferramenta desconhecida: ${message.name}`);
      // Formatar erro no formato esperado pelo n8n
      const errorResult = formatMcpResponse(`Erro: Ferramenta '${message.name}' não encontrada`, true);
      // O n8n espera um array de resultados
      console.log(JSON.stringify([errorResult]));
      return;
    }

    // Executar a ferramenta
    handler(message.arguments || {})
      .then(result => {
        console.error(`Resultado: ${JSON.stringify(result)}`);

        // Verificar se o resultado está no formato correto
        if (!result.content || !Array.isArray(result.content)) {
          console.error('Resultado em formato incorreto, corrigindo...');
          result = formatMcpResponse(JSON.stringify(result));
        }

        // Garantir que isError esteja definido
        if (result.isError === undefined) {
          result.isError = false;
        }

        // O n8n espera um array de resultados
        const formattedResult = [result];
        console.log(JSON.stringify(formattedResult));
      })
      .catch(error => {
        console.error(`Erro ao executar ferramenta ${message.name}:`, error);
        const errorResult = formatMcpResponse(`Erro: ${error.message}`, true);
        console.log(JSON.stringify([errorResult]));
      });
    return;
  }

  console.error(`Mensagem desconhecida: ${JSON.stringify(message)}`);
}

// Adicionar handler para processar mensagens no formato n8n
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.error(`Recebida mensagem: ${JSON.stringify(message)}`);

    // Processar a mensagem no formato n8n
    processN8nMessage(message);
  } catch (error) {
    console.error(`Erro ao processar mensagem: ${error.message}`);
  }
});

// Função principal para iniciar o servidor
async function main() {
  // Verificar se as credenciais estão configuradas
  if (!fbConfig.FB_APP_ID || !fbConfig.FB_APP_SECRET || !fbConfig.FB_ACCESS_TOKEN) {
    console.error('⚠️ ATENÇÃO: Credenciais do Facebook não configuradas!');
    console.error('O servidor pode não funcionar corretamente.');
  }

  // Iniciar servidor com transporte STDIO
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP do Facebook Insights iniciado em modo STDIO");
  console.error("Ferramentas disponíveis:");
  TOOL_DEFINITIONS.forEach(tool => {
    console.error(`- ${tool.name}: ${tool.description}`);
  });

  // Sinalizar que estamos prontos para o n8n
  console.log(JSON.stringify({ ready: true }));
}

// Verificar argumentos de linha de comando
const args = process.argv.slice(2);

// Se houver argumentos, executar ferramenta diretamente (modo CLI)
if (args.length > 0) {
  const funcao = args[0];
  const input = args[1] ? JSON.parse(args[1]) : {};

  // Exibir informações de configuração
  console.error("🔐 Variáveis de ambiente utilizadas:");
  console.error("FB_APP_ID:", fbConfig.FB_APP_ID);
  console.error("FB_APP_SECRET:", fbConfig.FB_APP_SECRET ? "***" : "não configurado");
  console.error("FB_ACCESS_TOKEN:", fbConfig.FB_ACCESS_TOKEN ? fbConfig.FB_ACCESS_TOKEN.substring(0, 10) + "..." : "não configurado");

  // Executar ferramenta
  if (toolHandlers[funcao]) {
    toolHandlers[funcao](input)
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error(`Erro ao executar ${funcao}:`, err);
        process.exit(1);
      });
  } else {
    console.error(`❌ Função desconhecida: ${funcao}`);
    process.exit(1);
  }
} else {
  // Iniciar servidor MCP
  main().catch((error) => {
    console.error("Erro Fatal:", error);
    process.exit(1);
  });
}
