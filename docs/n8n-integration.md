# Integração com n8n

Este guia explica como integrar o servidor MCP do Facebook Insights com o n8n usando o pacote `n8n-nodes-mcp`.

## Pré-requisitos

- n8n instalado e funcionando
- Pacote `n8n-nodes-mcp` instalado no n8n
- Credenciais do Facebook (App ID, App Secret e Access Token)

## Configuração

### 1. Instalar o servidor MCP no n8n

1. Copie os arquivos do servidor para o diretório `/tmp/mcp_facebook/` no seu servidor n8n:
   ```bash
   mkdir -p /tmp/mcp_facebook
   cp index.js package.json /tmp/mcp_facebook/
   ```

2. Instale as dependências:
   ```bash
   cd /tmp/mcp_facebook
   npm install
   ```

### 2. Configurar o fluxo de trabalho no n8n

1. Crie um novo fluxo de trabalho no n8n.

2. Adicione um nó "Execute Command" com as seguintes configurações:
   - **Command**: `node`
   - **Arguments**: `/tmp/mcp_facebook/index.js`
   - **Environment Variables**:
     ```
     FB_APP_ID=seu_app_id
     FB_APP_SECRET=seu_app_secret
     FB_ACCESS_TOKEN=seu_access_token
     PORT=8080
     ```

3. Adicione um nó "MCP Client" com a operação "listTools" e configure:
   - **URL**: `http://localhost:8080/tools`

4. Adicione um nó "AI Agent" e configure-o para usar as ferramentas MCP.

5. Conecte os nós da seguinte forma:
   - "Execute Command" → "MCP Client"
   - "MCP Client" → "AI Agent"

## Exemplo de fluxo de trabalho

![Exemplo de fluxo de trabalho](workflow-example.png)

Neste exemplo:
1. O nó "Execute Command" inicia o servidor MCP
2. O nó "MCP Client" lista as ferramentas disponíveis
3. O nó "AI Agent" usa essas ferramentas para interagir com a API do Facebook

## Usando as ferramentas MCP

O agente de IA pode usar as seguintes ferramentas:

- `facebook-list-ad-accounts`: Lista todas as contas de anúncios disponíveis
- `facebook-account-info`: Obtém informações detalhadas sobre uma conta específica
- `facebook-insights-get`: Recupera dados de insights para uma conta específica
- `facebook-campaigns`: Obtém campanhas para uma conta específica
- `facebook-adsets`: Obtém conjuntos de anúncios para uma campanha ou conta
- `facebook-ads`: Obtém anúncios para um conjunto de anúncios ou conta
- `facebook-insights`: Um handler genérico para fazer chamadas de API personalizadas

## Solução de problemas

- **Erro "Connection refused"**: Verifique se o servidor MCP está em execução e se a porta configurada está correta.
- **Erro "Authentication failed"**: Verifique se as credenciais do Facebook estão corretas e se o token de acesso não expirou.
- **Erro "Permission denied"**: Verifique se o token de acesso tem as permissões necessárias para acessar a API de Marketing do Facebook.
