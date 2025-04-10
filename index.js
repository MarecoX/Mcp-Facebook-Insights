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

// Lidar com solicitações
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

  // Endpoint para listar ferramentas (MCP listTools)
  if (req.method === 'GET' && req.url === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools }));
    return;
  }

  // Endpoint para executar uma ferramenta (MCP executeTool)
  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';

    // Coletar corpo da solicitação
    req.on('data', chunk => {
      body += chunk.toString();
    });

    // Processar a solicitação
    req.on('end', async () => {
      try {
        // Analisar o corpo da solicitação
        const { name, parameters } = JSON.parse(body);

        console.log(`Executando ferramenta: ${name}`);

        // Verificar se a ferramenta existe
        if (!executeTools[name]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: true,
            message: `Ferramenta não encontrada: ${name}`
          }));
          return;
        }

        // Executar a ferramenta
        const result = await executeTools[name](parameters);

        // Enviar a resposta
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      } catch (error) {
        console.error('Erro ao processar solicitação:', error.message);

        // Enviar resposta de erro
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: true,
          message: error.message
        }));
      }
    });
    return;
  }

  // Endpoint de status
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      tools: tools.map(tool => tool.name),
      version: '1.0.0',
      name: 'Facebook Insights MCP Server'
    }));
    return;
  }

  // Não encontrado
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: true,
    message: 'Endpoint não encontrado'
  }));
});

// Iniciar o servidor
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
