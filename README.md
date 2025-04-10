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
   git clone https://github.com/MarecoX/mcp-facebook-insights.git
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
   curl -s https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/install.sh | bash
   ```

3. Siga as instruções na tela para configurar o MCP no n8n.

#### Opção 2: Instalação Manual

1. Copie os arquivos para o diretório `/tmp/mcp_facebook/` no seu servidor n8n:
   ```bash
   mkdir -p /tmp/mcp_facebook
   cd /tmp/mcp_facebook
   curl -s -L -o index.js https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/index.js
   curl -s -L -o package.json https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/package.json
   ```

2. Instale as dependências:
   ```bash
   cd /tmp/mcp_facebook
   npm install
   ```

3. Configure o nó "MCP Client" no n8n:
   - **Comando**: `node`
   - **Argumentos**: `/tmp/mcp_facebook/index.js`
   - **Variáveis de ambiente**:
     - `FB_APP_ID`: Seu ID de aplicativo do Facebook
     - `FB_APP_SECRET`: Seu segredo de aplicativo do Facebook
     - `FB_ACCESS_TOKEN`: Seu token de acesso do Facebook

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
   - Nó "MCP Client" com a operação "listTools" para listar as ferramentas disponíveis
   - Nó "AI Agent" que pode interagir com as ferramentas MCP
   - Nó "MCP Client" com a operação "executeTool" para executar uma ferramenta específica

3. Configure o nó "MCP Client" com as credenciais:
   - **Comando**: `node`
   - **Argumentos**: `/tmp/mcp_facebook/index.js`
   - **Variáveis de ambiente**:
     - `FB_APP_ID`: Seu ID de aplicativo do Facebook
     - `FB_APP_SECRET`: Seu segredo de aplicativo do Facebook
     - `FB_ACCESS_TOKEN`: Seu token de acesso do Facebook

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

## Arquitetura

Este servidor MCP utiliza:

- **@modelcontextprotocol/sdk**: SDK oficial do protocolo MCP
- **StdioServerTransport**: Para comunicação STDIO com o n8n
- **zod**: Para validação de parâmetros de entrada
- **axios**: Para fazer requisições à API do Facebook

## Licença

MIT
