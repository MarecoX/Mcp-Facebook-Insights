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
    facebookListAdAccounts: z.object({}),

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
      method: z.enum(["GET", "POST"]).default("GET").describe("Método HTTP (GET, POST)"),
      queryParams: z.record(z.any()).optional().describe("Parâmetros de consulta para a API"),
      body: z.record(z.any()).optional().describe("Corpo da requisição para métodos POST")
    })
  }
};

// Definições das ferramentas MCP
const TOOL_DEFINITIONS = [
  {
    name: "facebook-list-ad-accounts",
    description: "Lista todas as contas de anúncios do Facebook disponíveis",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
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
          items: { type: "string" },
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

// Função para fazer requisições à API do Facebook
async function facebookApiRequest(endpoint, method = 'GET', queryParams = {}, body = null) {
  try {
    // Verificar se as credenciais estão configuradas
    if (!fbConfig.FB_ACCESS_TOKEN) {
      throw new Error('Token de acesso do Facebook não configurado');
    }

    // Construir URL com parâmetros de consulta
    const baseUrl = 'https://graph.facebook.com/v19.0';
    const url = `${baseUrl}/${endpoint}`;

    // Adicionar token de acesso aos parâmetros de consulta
    const params = {
      access_token: fbConfig.FB_ACCESS_TOKEN,
      ...queryParams
    };

    console.error(`Fazendo requisição ${method} para ${url}`);

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
    // Validar parâmetros de entrada
    schemas.toolInputs.facebookListAdAccounts.parse(args);

    console.error('Listando Contas de Anúncios do Facebook');

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest('me/adaccounts', 'GET', {
      fields: 'id,name,account_id,account_status'
    });

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Contas de anúncios encontradas: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Obtém informações detalhadas sobre uma conta específica
  "facebook-account-info": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookAccountInfo.parse(args);

    console.error(`Obtendo informações da conta: ${parsed.accountId}`);

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(`${parsed.accountId}`, 'GET', {
      fields: 'id,name,account_id,account_status,age,amount_spent,balance,business,business_city,business_country_code,business_name,business_state,business_street,business_street2,business_zip,capabilities,created_time,currency,disable_reason,end_advertiser,end_advertiser_name,existing_customers,fb_entity,funding_source,funding_source_details,has_migrated_permissions,io_number,is_attribution_spec_system_default,is_direct_deals_enabled,is_in_3ds_authorization_enabled_market,is_notifications_enabled,is_personal,is_prepay_account,is_tax_id_required,line_numbers,media_agency,min_campaign_group_spend_cap,min_daily_budget,owner,partner,tax_id,tax_id_status,tax_id_type,timezone_id,timezone_name,timezone_offset_hours_utc,rf_spec,user_tasks,user_tos_accepted'
    });

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Informações da conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Recupera dados de insights para uma conta específica
  "facebook-insights-get": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookInsightsGet.parse(args);

    console.error(`Obtendo insights para a conta: ${parsed.accountId}`);

    // Preparar parâmetros de consulta
    const queryParams = {
      fields: parsed.metrics.join(','),
      level: 'account'
    };

    // Adicionar parâmetros opcionais se fornecidos
    if (parsed.date_preset) {
      queryParams.date_preset = parsed.date_preset;
    }

    if (parsed.time_increment) {
      queryParams.time_increment = parsed.time_increment;
    }

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(`${parsed.accountId}/insights`, 'GET', queryParams);

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Insights para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Obtém campanhas para uma conta específica
  "facebook-campaigns": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookCampaigns.parse(args);

    console.error(`Obtendo campanhas para a conta: ${parsed.accountId}`);

    // Preparar parâmetros de consulta
    const queryParams = {
      fields: 'id,name,status,objective,buying_type,special_ad_categories,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,insights{impressions,clicks,spend}'
    };

    // Adicionar filtro de status se fornecido
    if (parsed.status && parsed.status !== 'ALL') {
      queryParams.effective_status = [parsed.status];
    }

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(`${parsed.accountId}/campaigns`, 'GET', queryParams);

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Campanhas para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Obtém conjuntos de anúncios para uma campanha ou conta
  "facebook-adsets": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookAdsets.parse(args);

    console.error(`Obtendo conjuntos de anúncios para a conta: ${parsed.accountId}`);

    // Determinar o endpoint com base nos parâmetros
    let endpoint = `${parsed.accountId}/adsets`;
    if (parsed.campaignId) {
      endpoint = `${parsed.campaignId}/adsets`;
      console.error(`Filtrando por campanha: ${parsed.campaignId}`);
    }

    // Preparar parâmetros de consulta
    const queryParams = {
      fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,budget_remaining,targeting,bid_amount,billing_event,optimization_goal,attribution_spec'
    };

    // Adicionar filtro de status se fornecido
    if (parsed.status && parsed.status !== 'ALL') {
      queryParams.effective_status = [parsed.status];
    }

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(endpoint, 'GET', queryParams);

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Conjuntos de anúncios para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Obtém anúncios para um conjunto de anúncios ou conta
  "facebook-ads": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookAds.parse(args);

    console.error(`Obtendo anúncios para a conta: ${parsed.accountId}`);

    // Determinar o endpoint com base nos parâmetros
    let endpoint = `${parsed.accountId}/ads`;
    if (parsed.adsetId) {
      endpoint = `${parsed.adsetId}/ads`;
      console.error(`Filtrando por conjunto de anúncios: ${parsed.adsetId}`);
    }

    // Preparar parâmetros de consulta
    const queryParams = {
      fields: 'id,name,status,adset_id,creative,tracking_specs,bid_amount'
    };

    // Adicionar filtro de status se fornecido
    if (parsed.status && parsed.status !== 'ALL') {
      queryParams.effective_status = [parsed.status];
    }

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(endpoint, 'GET', queryParams);

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Anúncios para a conta ${parsed.accountId}: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  },

  // Handler genérico para fazer chamadas personalizadas à API do Facebook
  "facebook-insights": async (args) => {
    // Validar parâmetros de entrada
    const parsed = schemas.toolInputs.facebookInsights.parse(args);

    console.error(`Recebida solicitação para Facebook Insights: ${JSON.stringify({
      endpoint: parsed.endpoint,
      method: parsed.method,
      queryParams: parsed.queryParams
    })}`);

    // Fazer requisição à API do Facebook
    const response = await facebookApiRequest(
      parsed.endpoint,
      parsed.method,
      parsed.queryParams || {},
      parsed.body || null
    );

    // Formatar resposta
    return {
      content: [{
        type: "text",
        text: `Resultado da API do Facebook: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
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
  console.error("Ferramenta requisitada pelo cliente (ListToolsRequestSchema)");
  return { tools: TOOL_DEFINITIONS };
});

// Adicionar handler para o método listTools (compatível com n8n)
server.addRawRequestHandler(async (request) => {
  if (request.jsonrpc === '2.0' && request.method === 'listTools') {
    console.error("Ferramenta requisitada pelo cliente (listTools JSON-RPC)");
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { tools: TOOL_DEFINITIONS }
    };
  }
  return null;
});

// Configurar handler para executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`Executando ferramenta: ${name}`);

  try {
    // Verificar se a ferramenta existe
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Ferramenta desconhecida: ${name}`);
    }

    // Executar a ferramenta
    return await handler(args);
  } catch (error) {
    console.error(`Erro ao executar ferramenta ${name}:`, error);
    throw error;
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
