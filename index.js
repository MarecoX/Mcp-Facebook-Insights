#!/usr/bin/env node

/**
 * Facebook Insights MCP Server
 *
 * Este servidor implementa o protocolo MCP (Model Context Protocol) para permitir
 * que modelos de linguagem acessem a API de Facebook Marketing Insights.
 *
 * Configuração:
 * - Defina as variáveis de ambiente FB_APP_ID, FB_APP_SECRET e FB_ACCESS_TOKEN
 * - Ou elas serão lidas dos valores padrão fornecidos
 */

const http = require('http');
const axios = require('axios');
const readline = require('readline');

// Configuração para suporte a STDIO (usado pelo n8n)
let isStdioMode = false;

// Verificar se estamos sendo executados pelo n8n (STDIO mode)
if (!process.stdout.isTTY || process.env.MCP_STDIO_MODE === 'true') {
  isStdioMode = true;
  console.log('Iniciando em modo STDIO para integração com n8n...');
}

// Configuração do Facebook - lê de variáveis de ambiente
const fbConfig = {
  FB_APP_ID: process.env.FB_APP_ID || '',
  FB_APP_SECRET: process.env.FB_APP_SECRET || '',
  FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN || ''
};

// Verificar se as credenciais foram fornecidas
if (!fbConfig.FB_APP_ID || !fbConfig.FB_APP_SECRET || !fbConfig.FB_ACCESS_TOKEN) {
  console.warn('⚠️ ATENÇÃO: Credenciais do Facebook não configuradas!');
  console.warn('Configure as variáveis de ambiente FB_APP_ID, FB_APP_SECRET e FB_ACCESS_TOKEN');
  console.warn('Exemplo: FB_APP_ID=seu_app_id FB_APP_SECRET=seu_app_secret FB_ACCESS_TOKEN=seu_token node index.js');
}

// Porta do servidor
const PORT = process.env.PORT || 8082;

// Definir as ferramentas MCP
const tools = [
  {
    name: 'facebook-list-ad-accounts',
    description: 'Lista todas as contas de anúncios do Facebook disponíveis',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'facebook-account-info',
    description: 'Obtém informações detalhadas sobre uma conta específica do Facebook',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID da conta do Facebook (formato: act_XXXXXXXXX)'
        }
      },
      required: ['accountId']
    }
  },
  {
    name: 'facebook-insights-get',
    description: 'Recupera dados de insights para uma conta específica do Facebook',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID da conta do Facebook (formato: act_XXXXXXXXX)'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Lista de métricas a serem recuperadas (ex: impressions, clicks, spend)'
        },
        date_preset: {
          type: 'string',
          description: 'Período de tempo predefinido (ex: today, yesterday, last_7d, last_30d)',
          default: 'last_30d'
        },
        time_increment: {
          type: 'integer',
          description: 'Incremento de tempo em dias (1 = diário, 7 = semanal, 30 = mensal)',
          default: 1
        }
      },
      required: ['accountId', 'metrics']
    }
  },
  {
    name: 'facebook-campaigns',
    description: 'Obtém campanhas para uma conta específica do Facebook',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID da conta do Facebook (formato: act_XXXXXXXXX)'
        },
        status: {
          type: 'string',
          description: 'Status das campanhas a serem recuperadas (ACTIVE, PAUSED, ARCHIVED, ALL)',
          default: 'ACTIVE'
        }
      },
      required: ['accountId']
    }
  },
  {
    name: 'facebook-adsets',
    description: 'Obtém conjuntos de anúncios para uma campanha ou conta do Facebook',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID da conta do Facebook (formato: act_XXXXXXXXX)'
        },
        campaignId: {
          type: 'string',
          description: 'ID da campanha (opcional)'
        },
        status: {
          type: 'string',
          description: 'Status dos conjuntos de anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)',
          default: 'ACTIVE'
        }
      },
      required: ['accountId']
    }
  },
  {
    name: 'facebook-ads',
    description: 'Obtém anúncios para um conjunto de anúncios ou conta do Facebook',
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'ID da conta do Facebook (formato: act_XXXXXXXXX)'
        },
        adsetId: {
          type: 'string',
          description: 'ID do conjunto de anúncios (opcional)'
        },
        status: {
          type: 'string',
          description: 'Status dos anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)',
          default: 'ACTIVE'
        }
      },
      required: ['accountId']
    }
  },
  {
    name: 'facebook-insights',
    description: 'Handler genérico para fazer chamadas personalizadas à API do Facebook',
    parameters: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'Endpoint da API do Facebook (ex: me/adaccounts, act_XXXXXXXXX/insights)'
        },
        method: {
          type: 'string',
          description: 'Método HTTP (GET, POST, DELETE)',
          default: 'GET'
        },
        queryParams: {
          type: 'object',
          description: 'Parâmetros de consulta para a API'
        },
        body: {
          type: 'object',
          description: 'Corpo da requisição para métodos POST'
        }
      },
      required: ['endpoint']
    }
  }
];

// Implementar as funções de execução das ferramentas
const executeTools = {
  'facebook-insights': async (params) => {
    console.log('Recebida solicitação para Facebook Insights:', params);

    try {
      // Extrair parâmetros
      const { endpoint, method = 'GET', queryParams = {}, body = {} } = params;

      // Construir a URL
      const baseUrl = 'https://graph.facebook.com/v19.0';
      const url = `${baseUrl}/${endpoint}`;

      // Adicionar token de acesso aos parâmetros de consulta
      const requestParams = {
        ...queryParams,
        access_token: fbConfig.FB_ACCESS_TOKEN
      };

      console.log(`Fazendo requisição ${method} para ${url}`);

      // Fazer a requisição para a API do Facebook
      const response = await axios({
        method: method.toLowerCase(),
        url,
        params: requestParams,
        data: method !== 'GET' ? body : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Resposta da API do Facebook:', response.status);

      // Retornar a resposta
      return {
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error('Erro ao chamar a API do Facebook:', error.message);

      // Retornar detalhes do erro
      throw new Error(JSON.stringify({
        error: true,
        status: error.response?.status || 500,
        message: error.message,
        details: error.response?.data || {}
      }));
    }
  },

  'facebook-insights-get': async (params) => {
    console.log('Obtendo Facebook Insights com parâmetros:', params);

    try {
      const { accountId, metrics, date_preset, time_increment } = params;

      // Construir o endpoint
      const endpoint = `${accountId}/insights`;

      // Construir parâmetros de consulta
      const queryParams = {
        fields: metrics.join(','),
        date_preset: date_preset || 'last_30d',
        time_increment: time_increment || 1
      };

      // Usar o handler genérico
      return await executeTools['facebook-insights']({
        endpoint,
        method: 'GET',
        queryParams
      });
    } catch (error) {
      console.error('Erro no handler facebook-insights-get:', error.message);
      throw new Error(`Erro ao obter insights: ${error.message}`);
    }
  },

  'facebook-list-ad-accounts': async () => {
    console.log('Listando Contas de Anúncios do Facebook');

    try {
      // Usar o handler genérico para obter contas de anúncios
      return await executeTools['facebook-insights']({
        endpoint: 'me/adaccounts',
        queryParams: {
          fields: 'id,name,account_id,account_status'
        }
      });
    } catch (error) {
      console.error('Erro ao listar contas de anúncios:', error.message);
      throw new Error(`Erro ao listar contas de anúncios: ${error.message}`);
    }
  },

  'facebook-account-info': async (params) => {
    console.log('Obtendo Informações da Conta do Facebook para:', params.accountId);

    try {
      const { accountId } = params;

      // Usar o handler genérico
      return await executeTools['facebook-insights']({
        endpoint: accountId,
        queryParams: {
          fields: 'id,name,account_id,account_status,age,amount_spent,balance,business,currency,min_campaign_group_spend_cap'
        }
      });
    } catch (error) {
      console.error('Erro ao obter informações da conta:', error.message);
      throw new Error(`Erro ao obter informações da conta: ${error.message}`);
    }
  },

  'facebook-campaigns': async (params) => {
    console.log('Obtendo campanhas do Facebook para:', params.accountId);

    try {
      const { accountId, status = 'ACTIVE' } = params;

      // Usar o handler genérico
      return await executeTools['facebook-insights']({
        endpoint: `${accountId}/campaigns`,
        queryParams: {
          fields: 'id,name,status,objective,spend_cap,budget_remaining,daily_budget,lifetime_budget,start_time,stop_time',
          status: status
        }
      });
    } catch (error) {
      console.error('Erro ao obter campanhas:', error.message);
      throw new Error(`Erro ao obter campanhas: ${error.message}`);
    }
  },

  'facebook-adsets': async (params) => {
    console.log('Obtendo conjuntos de anúncios do Facebook para:', params);

    try {
      const { accountId, campaignId, status = 'ACTIVE' } = params;

      // Determinar o endpoint com base nos parâmetros
      let endpoint;
      if (campaignId) {
        endpoint = `${campaignId}/adsets`;
      } else {
        endpoint = `${accountId}/adsets`;
      }

      // Usar o handler genérico
      return await executeTools['facebook-insights']({
        endpoint,
        queryParams: {
          fields: 'id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,bid_amount',
          status: status
        }
      });
    } catch (error) {
      console.error('Erro ao obter conjuntos de anúncios:', error.message);
      throw new Error(`Erro ao obter conjuntos de anúncios: ${error.message}`);
    }
  },

  'facebook-ads': async (params) => {
    console.log('Obtendo anúncios do Facebook para:', params);

    try {
      const { accountId, adsetId, status = 'ACTIVE' } = params;

      // Determinar o endpoint com base nos parâmetros
      let endpoint;
      if (adsetId) {
        endpoint = `${adsetId}/ads`;
      } else {
        endpoint = `${accountId}/ads`;
      }

      // Usar o handler genérico
      return await executeTools['facebook-insights']({
        endpoint,
        queryParams: {
          fields: 'id,name,status,adset_id,creative,tracking_specs,bid_amount',
          status: status
        }
      });
    } catch (error) {
      console.error('Erro ao obter anúncios:', error.message);
      throw new Error(`Erro ao obter anúncios: ${error.message}`);
    }
  }
};

// Função para processar requisições MCP
async function processMcpRequest(request) {
  try {
    // Verificar o tipo de requisição
    if (request.jsonrpc === '2.0') {
      // Requisição JSON-RPC 2.0
      const { method, params, id } = request;

      if (method === 'listTools') {
        // Listar ferramentas disponíveis
        return {
          jsonrpc: '2.0',
          id,
          result: { tools }
        };
      } else if (method === 'executeTool') {
        // Executar uma ferramenta
        const { name, parameters } = params;
        console.log(`Executando ferramenta: ${name}`);

        // Encontrar a ferramenta pelo nome
        if (!executeTools[name]) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: `Ferramenta '${name}' não encontrada`
            }
          };
        }

        // Executar a ferramenta
        const result = await executeTools[name](parameters);
        return {
          jsonrpc: '2.0',
          id,
          result: { result }
        };
      } else {
        // Método desconhecido
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Método '${method}' não encontrado`
          }
        };
      }
    } else {
      // Requisição HTTP simples
      if (request.url === '/tools' && request.method === 'GET') {
        return { tools };
      } else if (request.url === '/execute' && request.method === 'POST') {
        const { name, parameters } = request.body;
        console.log(`Executando ferramenta: ${name}`);

        // Encontrar a ferramenta pelo nome
        if (!executeTools[name]) {
          return {
            error: true,
            message: `Ferramenta não encontrada: ${name}`
          };
        }

        // Executar a ferramenta
        const result = await executeTools[name](parameters);
        return { result };
      } else if (request.url === '/status' && request.method === 'GET') {
        return {
          status: 'ok',
          tools: tools.map(tool => tool.name),
          version: '1.0.0',
          name: 'Facebook Insights MCP Server'
        };
      } else {
        return {
          error: true,
          message: 'Endpoint não encontrado'
        };
      }
    }
  } catch (error) {
    console.error('Erro ao processar requisição MCP:', error);
    if (request.jsonrpc === '2.0') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    } else {
      return {
        error: true,
        message: error.message
      };
    }
  }
}

// Configurar modo STDIO se necessário
if (isStdioMode) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  // Processar linhas de entrada
  rl.on('line', async (line) => {
    try {
      // Tentar analisar a linha como JSON
      const request = JSON.parse(line);

      // Processar a requisição
      const response = await processMcpRequest(request);

      // Enviar a resposta
      console.log(JSON.stringify(response));
    } catch (error) {
      console.error('Erro ao processar linha:', error);
      // Enviar erro
      if (line && typeof line === 'string' && line.includes('"id"')) {
        try {
          const parsed = JSON.parse(line);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id,
            error: {
              code: -32700,
              message: 'Parse error'
            }
          }));
        } catch (e) {
          console.error('Não foi possível extrair ID da requisição inválida');
        }
      }
    }
  });

  // Sinalizar que estamos prontos
  console.error('Servidor MCP do Facebook Insights iniciado em modo STDIO');
  console.error('Ferramentas disponíveis:');
  tools.forEach(tool => {
    console.error(`- ${tool.name}: ${tool.description}`);
  });
}

// Lidar com solicitações HTTP
const server = http.createServer(async (req, res) => {
  // Definir cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lidar com solicitações de preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Preparar objeto de requisição para processMcpRequest
  const request = {
    method: req.method,
    url: req.url,
    body: {}
  };

  // Processar corpo da requisição se for POST
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    await new Promise((resolve) => {
      req.on('end', () => {
        try {
          request.body = JSON.parse(body);
        } catch (error) {
          console.error('Erro ao analisar corpo da requisição:', error);
        }
        resolve();
      });
    });
  }

  // Processar a requisição usando a função compartilhada
  const response = await processMcpRequest(request);

  // Determinar o código de status com base na resposta
  let statusCode = 200;
  if (response.error === true) {
    statusCode = 404;
  }

  // Enviar a resposta
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
});

// Iniciar o servidor apenas se não estivermos em modo STDIO
if (!isStdioMode) {
  server.listen(PORT, () => {
    console.log(`Servidor MCP do Facebook Insights iniciado na porta ${PORT}`);
    console.log('Ferramentas disponíveis:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    console.log('\nStatus das credenciais do Facebook:');
    if (fbConfig.FB_APP_ID && fbConfig.FB_APP_SECRET && fbConfig.FB_ACCESS_TOKEN) {
      console.log('- Credenciais configuradas corretamente');
    } else {
      console.log('- Credenciais não configuradas. O servidor não funcionará corretamente até que as credenciais sejam fornecidas.');
    }
  });
} else {
  // Em modo STDIO, apenas exibir informações básicas
  console.error('Servidor MCP do Facebook Insights iniciado em modo STDIO');
  console.error('Ferramentas disponíveis:');
  tools.forEach(tool => {
    console.error(`- ${tool.name}: ${tool.description}`);
  });
}
