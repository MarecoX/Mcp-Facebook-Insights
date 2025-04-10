# Facebook Insights MCP Server

Este servidor implementa o protocolo MCP (Model Context Protocol) para permitir que modelos de linguagem acessem a API de Facebook Marketing Insights.

## Requisitos

- Node.js 14 ou superior
- Conta de desenvolvedor do Facebook com acesso à API de Marketing
- Credenciais de API do Facebook (App ID, App Secret e Access Token)

## Instalação

### Instalação Local

1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/mcp-facebook-insights.git
   cd mcp-facebook-insights
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente com suas credenciais do Facebook:
   ```bash
   export FB_APP_ID=seu_app_id
   export FB_APP_SECRET=seu_app_secret
   export FB_ACCESS_TOKEN=seu_access_token
   ```

4. Inicie o servidor:
   ```bash
   node index.js
   ```

### Instalação no n8n

#### Opção 1: Auto-Instalador (Recomendado)

Use nosso script de auto-instalação que configura tudo automaticamente:

1. Acesse o shell do contêiner n8n:
   ```bash
   # Se estiver usando docker diretamente
   docker exec -it seu_container_n8n bash
   ```

2. Execute o script de auto-instalação:
   ```bash
   curl -s https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/auto-install.sh | bash
   ```

3. Siga as instruções na tela para configurar suas credenciais do Facebook.

4. Configure o nó "Execute Command" no n8n conforme as instruções exibidas pelo instalador.

#### Opção 2: Instalação Manual

1. Copie os arquivos `index.js` e `package.json` para o diretório `/tmp/mcp_facebook/` no seu servidor n8n:
   ```bash
   mkdir -p /tmp/mcp_facebook
   cp index.js package.json /tmp/mcp_facebook/
   ```

2. Instale as dependências:
   ```bash
   cd /tmp/mcp_facebook
   npm install
   ```

3. Configure o nó "Execute Command" no n8n:
   - **Command**: `node`
   - **Arguments**: `/tmp/mcp_facebook/index.js`
   - **Environment Variables**: É **obrigatório** definir as seguintes variáveis:
     - `FB_APP_ID`: Seu ID de aplicativo do Facebook
     - `FB_APP_SECRET`: Seu segredo de aplicativo do Facebook
     - `FB_ACCESS_TOKEN`: Seu token de acesso do Facebook
     - `PORT`: Porta em que o servidor será executado (opcional, padrão: 8082)

## Obtendo Credenciais do Facebook

1. Acesse o [Facebook Developers](https://developers.facebook.com/) e crie um aplicativo.
2. No painel do aplicativo, adicione o produto "Marketing API".
3. Gere um token de acesso com as permissões necessárias (ads_management, ads_read, etc.).
4. Anote o App ID, App Secret e o Access Token gerado.

## Integração com n8n

Este servidor é compatível com o pacote `n8n-nodes-mcp`, que permite que modelos de linguagem interajam com ferramentas externas através do protocolo MCP.

### Configuração no n8n

1. Instale o pacote `n8n-nodes-mcp` no seu n8n.

2. Crie um fluxo de trabalho com os seguintes nós:
   - Nó "Execute Command" para iniciar o servidor MCP
   - Nó "MCP Client" com a operação "listTools" para listar as ferramentas disponíveis
   - Nó "AI Agent" que pode interagir com as ferramentas MCP

3. Configure o nó "MCP Client" para apontar para o servidor MCP:
   - URL para listTools: `http://localhost:8082/tools`
   - URL para executeTool: `http://localhost:8082/execute`

## Ferramentas Disponíveis

O servidor fornece as seguintes ferramentas MCP:

- `facebook-list-ad-accounts`: Lista todas as contas de anúncios disponíveis
- `facebook-account-info`: Obtém informações detalhadas sobre uma conta específica
- `facebook-insights-get`: Recupera dados de insights para uma conta específica
- `facebook-campaigns`: Obtém campanhas para uma conta específica
- `facebook-adsets`: Obtém conjuntos de anúncios para uma campanha ou conta
- `facebook-ads`: Obtém anúncios para um conjunto de anúncios ou conta
- `facebook-insights`: Um handler genérico para fazer chamadas de API personalizadas

## Exemplos de Uso

### Listar Contas de Anúncios

```json
{
  "name": "facebook-list-ad-accounts",
  "parameters": {}
}
```

### Obter Informações da Conta

```json
{
  "name": "facebook-account-info",
  "parameters": {
    "accountId": "act_123456789"
  }
}
```

### Obter Insights

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

### Obter Campanhas

```json
{
  "name": "facebook-campaigns",
  "parameters": {
    "accountId": "act_123456789",
    "status": "ACTIVE"
  }
}
```

## Endpoints da API

- `GET /tools`: Lista todas as ferramentas disponíveis (usado pelo nó MCP Client com operação listTools)
- `POST /execute`: Executa uma ferramenta (usado pelo nó MCP Client com operação executeTool)
- `GET /status`: Retorna o status do servidor

## Licença

MIT
