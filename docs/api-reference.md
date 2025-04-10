# Referência da API

Este documento descreve os endpoints da API do servidor MCP do Facebook Insights.

## Endpoints

### GET /tools

Lista todas as ferramentas disponíveis no servidor MCP.

**Resposta**:
```json
{
  "tools": [
    {
      "name": "facebook-list-ad-accounts",
      "description": "Lista todas as contas de anúncios do Facebook disponíveis",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    // ... outras ferramentas
  ]
}
```

### POST /execute

Executa uma ferramenta específica.

**Corpo da requisição**:
```json
{
  "name": "nome-da-ferramenta",
  "parameters": {
    // parâmetros específicos da ferramenta
  }
}
```

**Resposta**:
```json
{
  "result": {
    // resultado da execução da ferramenta
  }
}
```

### GET /status

Retorna o status do servidor.

**Resposta**:
```json
{
  "status": "ok",
  "tools": [
    "facebook-list-ad-accounts",
    "facebook-account-info",
    // ... outras ferramentas
  ],
  "version": "1.0.0",
  "name": "Facebook Insights MCP Server"
}
```

## Ferramentas disponíveis

### facebook-list-ad-accounts

Lista todas as contas de anúncios disponíveis.

**Parâmetros**: Nenhum

**Exemplo de uso**:
```json
{
  "name": "facebook-list-ad-accounts",
  "parameters": {}
}
```

### facebook-account-info

Obtém informações detalhadas sobre uma conta específica.

**Parâmetros**:
- `accountId` (string, obrigatório): ID da conta do Facebook (formato: act_XXXXXXXXX)

**Exemplo de uso**:
```json
{
  "name": "facebook-account-info",
  "parameters": {
    "accountId": "act_123456789"
  }
}
```

### facebook-insights-get

Recupera dados de insights para uma conta específica.

**Parâmetros**:
- `accountId` (string, obrigatório): ID da conta do Facebook (formato: act_XXXXXXXXX)
- `metrics` (array, obrigatório): Lista de métricas a serem recuperadas (ex: impressions, clicks, spend)
- `date_preset` (string, opcional): Período de tempo predefinido (ex: today, yesterday, last_7d, last_30d)
- `time_increment` (integer, opcional): Incremento de tempo em dias (1 = diário, 7 = semanal, 30 = mensal)

**Exemplo de uso**:
```json
{
  "name": "facebook-insights-get",
  "parameters": {
    "accountId": "act_123456789",
    "metrics": ["impressions", "clicks", "spend"],
    "date_preset": "last_30d",
    "time_increment": 1
  }
}
```

### facebook-campaigns

Obtém campanhas para uma conta específica.

**Parâmetros**:
- `accountId` (string, obrigatório): ID da conta do Facebook (formato: act_XXXXXXXXX)
- `status` (string, opcional): Status das campanhas a serem recuperadas (ACTIVE, PAUSED, ARCHIVED, ALL)

**Exemplo de uso**:
```json
{
  "name": "facebook-campaigns",
  "parameters": {
    "accountId": "act_123456789",
    "status": "ACTIVE"
  }
}
```

### facebook-adsets

Obtém conjuntos de anúncios para uma campanha ou conta.

**Parâmetros**:
- `accountId` (string, obrigatório): ID da conta do Facebook (formato: act_XXXXXXXXX)
- `campaignId` (string, opcional): ID da campanha
- `status` (string, opcional): Status dos conjuntos de anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)

**Exemplo de uso**:
```json
{
  "name": "facebook-adsets",
  "parameters": {
    "accountId": "act_123456789",
    "campaignId": "23456789012345678",
    "status": "ACTIVE"
  }
}
```

### facebook-ads

Obtém anúncios para um conjunto de anúncios ou conta.

**Parâmetros**:
- `accountId` (string, obrigatório): ID da conta do Facebook (formato: act_XXXXXXXXX)
- `adsetId` (string, opcional): ID do conjunto de anúncios
- `status` (string, opcional): Status dos anúncios a serem recuperados (ACTIVE, PAUSED, ARCHIVED, ALL)

**Exemplo de uso**:
```json
{
  "name": "facebook-ads",
  "parameters": {
    "accountId": "act_123456789",
    "adsetId": "34567890123456789",
    "status": "ACTIVE"
  }
}
```

### facebook-insights

Handler genérico para fazer chamadas personalizadas à API do Facebook.

**Parâmetros**:
- `endpoint` (string, obrigatório): Endpoint da API do Facebook (ex: me/adaccounts, act_XXXXXXXXX/insights)
- `method` (string, opcional): Método HTTP (GET, POST, DELETE)
- `queryParams` (object, opcional): Parâmetros de consulta para a API
- `body` (object, opcional): Corpo da requisição para métodos POST

**Exemplo de uso**:
```json
{
  "name": "facebook-insights",
  "parameters": {
    "endpoint": "act_123456789/insights",
    "method": "GET",
    "queryParams": {
      "fields": "impressions,clicks,spend",
      "date_preset": "last_30d"
    }
  }
}
```
