#!/bin/bash

# Script para instalar o Facebook Insights MCP Server no n8n

# Criar diretório de destino
mkdir -p /tmp/mcp_facebook

# Copiar arquivos
cp index.js /tmp/mcp_facebook/
cp package.json /tmp/mcp_facebook/

# Instalar dependências
cd /tmp/mcp_facebook
npm install

echo "=================================================="
echo "Instalação concluída!"
echo "=================================================="
echo ""
echo "Configure o nó 'Execute Command' no n8n com:"
echo "Command: node"
echo "Arguments: /tmp/mcp_facebook/index.js"
echo ""
echo "IMPORTANTE: Você precisa configurar as variáveis de ambiente:"
echo "FB_APP_ID=seu_app_id"
echo "FB_APP_SECRET=seu_app_secret"
echo "FB_ACCESS_TOKEN=seu_access_token"
echo ""
echo "Sem essas credenciais, o servidor não funcionará corretamente."
echo "=================================================="
