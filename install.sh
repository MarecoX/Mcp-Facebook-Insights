#!/bin/bash

# Cores para output
verde="\e[32m"
vermelho="\e[31m"
amarelo="\e[33m"
azul="\e[34m"
roxo="\e[35m"
ciano="\e[36m"
reset="\e[0m"

# Banner
echo -e "${ciano}==================================================${reset}"
echo -e "${ciano}       MCP FACEBOOK INSIGHTS INSTALLER       ${reset}"
echo -e "${ciano}==================================================${reset}"
echo -e "${verde}Desenvolvido com ${roxo}Augment AI ${verde}🤖${reset}"
echo -e "${azul}==================================================${reset}"
echo -e ""

# Verificar sistema operacional
if [ -f /etc/debian_version ]; then
    echo -e "${azul}Sistema Debian/Ubuntu detectado${reset}"
elif [ -f /etc/redhat-release ]; then
    echo -e "${azul}Sistema RedHat/CentOS detectado${reset}"
else
    echo -e "${amarelo}Sistema operacional não identificado. Tentando prosseguir...${reset}"
fi

# Acessar diretório /tmp
cd /tmp || {
    echo -e "${vermelho}Erro ao acessar o diretório /tmp${reset}"
    exit 1
}

# Verificar se o diretório mcp_facebook já existe
if [ -d "mcp_facebook" ]; then
    echo -e "${amarelo}O diretório /tmp/mcp_facebook já existe. Removendo...${reset}"
    rm -rf mcp_facebook
fi

# Criar diretório mcp_facebook
mkdir -p mcp_facebook
cd mcp_facebook || {
    echo -e "${vermelho}Erro ao acessar o diretório mcp_facebook${reset}"
    exit 1
}

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${vermelho}Node.js não encontrado. Por favor, instale o Node.js antes de continuar.${reset}"
    echo -e "Você pode instalar o Node.js com: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${vermelho}npm não encontrado. Por favor, instale o npm antes de continuar.${reset}"
    exit 1
fi

# Baixar arquivos do GitHub
echo -e "${azul}Baixando arquivos do GitHub...${reset}"
if command -v curl &> /dev/null; then
    curl -s -L -o index.js https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/index.js
    curl -s -L -o package.json https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/package.json
    curl -s -L -o .env.example https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/.env.example
elif command -v wget &> /dev/null; then
    wget -q -O index.js https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/index.js
    wget -q -O package.json https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/package.json
    wget -q -O .env.example https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/.env.example
else
    echo -e "${vermelho}Nem curl nem wget estão instalados. Não é possível baixar os arquivos.${reset}"
    exit 1
fi

# Verificar se os arquivos foram baixados
if [ ! -f index.js ] || [ ! -f package.json ]; then
    echo -e "${vermelho}Falha ao baixar os arquivos necessários.${reset}"
    exit 1
fi

# Instalar dependências
echo -e "${azul}Instalando dependências...${reset}"
npm install @modelcontextprotocol/sdk@^1.9.0 axios@^1.6.2 dotenv@^16.3.1 zod@^3.22.4

# Verificar se a instalação foi bem-sucedida
if [ $? -ne 0 ]; then
    echo -e "${vermelho}Falha ao instalar as dependências.${reset}"
    exit 1
fi

# Criar arquivo .env de exemplo se não existir
if [ ! -f .env ]; then
    echo -e "${azul}Criando arquivo .env de exemplo...${reset}"
    cat > .env.example << EOL
# Credenciais do Facebook
FB_APP_ID=seu_app_id
FB_APP_SECRET=seu_app_secret
FB_ACCESS_TOKEN=seu_access_token

# Configuração do servidor
PORT=8082
EOL
    echo -e "${amarelo}Um arquivo .env.example foi criado. Você deve configurar suas credenciais no n8n.${reset}"
fi

# Tornar o script executável
chmod +x index.js

echo -e "${verde}==================================================${reset}"
echo -e "${verde}Instalação concluída com sucesso!${reset}"
echo -e "${verde}==================================================${reset}"
echo ""
echo -e "${azul}Para usar o MCP Facebook Insights no n8n, configure:${reset}"
echo ""
echo -e "${roxo}No nó 'MCP Client' (credencial):${reset}"
echo -e "Command: ${verde}node${reset}"
echo -e "Arguments: ${verde}/tmp/mcp_facebook/index.js${reset}"
echo -e "Environment Variables:"
echo -e "${verde}FB_APP_ID=seu_app_id${reset}"
echo -e "${verde}FB_APP_SECRET=seu_app_secret${reset}"
echo -e "${verde}FB_ACCESS_TOKEN=seu_access_token${reset}"
echo ""
echo -e "${roxo}Ferramentas disponíveis:${reset}"
echo -e "- facebook-list-ad-accounts: Lista todas as contas de anúncios"
echo -e "- facebook-account-info: Obtém informações de uma conta"
echo -e "- facebook-insights-get: Obtém insights de uma conta"
echo -e "- facebook-campaigns: Obtém campanhas de uma conta"
echo -e "- facebook-adsets: Obtém conjuntos de anúncios"
echo -e "- facebook-ads: Obtém anúncios"
echo -e "- facebook-insights: Handler genérico para API do Facebook"
echo ""
echo -e "${verde}==================================================${reset}"

# Perguntar se deseja configurar as credenciais
read -p "${amarelo}Deseja configurar as credenciais do Facebook agora? (s/n): ${reset}" configurar
if [[ "$configurar" == "s" || "$configurar" == "S" ]]; then
    echo -e "${azul}Configurando credenciais do Facebook...${reset}"
    read -p "Digite seu Facebook App ID: " fb_app_id
    read -p "Digite seu Facebook App Secret: " fb_app_secret
    read -p "Digite seu Facebook Access Token: " fb_access_token

    # Salvar credenciais em um arquivo .env
    echo "FB_APP_ID=$fb_app_id" > .env
    echo "FB_APP_SECRET=$fb_app_secret" >> .env
    echo "FB_ACCESS_TOKEN=$fb_access_token" >> .env

    echo -e "${verde}Credenciais salvas no arquivo .env${reset}"

    # Perguntar se deseja testar com as credenciais
    read -p "${amarelo}Deseja testar o servidor com suas credenciais? (s/n): ${reset}" testar_cred
    if [[ "$testar_cred" == "s" || "$testar_cred" == "S" ]]; then
        echo -e "${azul}Testando o servidor MCP com suas credenciais...${reset}"
        echo -e "${amarelo}Listando contas de anúncios disponíveis:${reset}"
        FB_APP_ID="$fb_app_id" FB_APP_SECRET="$fb_app_secret" FB_ACCESS_TOKEN="$fb_access_token" node index.js facebook-list-ad-accounts
        echo -e "\n${verde}Teste concluído!${reset}"

        # Perguntar se deseja iniciar o servidor
        read -p "${amarelo}Deseja iniciar o servidor MCP agora? (s/n): ${reset}" iniciar
        if [[ "$iniciar" == "s" || "$iniciar" == "S" ]]; then
            echo -e "${azul}Iniciando o servidor MCP...${reset}"
            echo -e "${amarelo}Pressione Ctrl+C para encerrar o servidor.${reset}"
            FB_APP_ID="$fb_app_id" FB_APP_SECRET="$fb_app_secret" FB_ACCESS_TOKEN="$fb_access_token" node index.js
        fi
    else
        # Perguntar se deseja iniciar o servidor
        read -p "${amarelo}Deseja iniciar o servidor MCP agora? (s/n): ${reset}" iniciar
        if [[ "$iniciar" == "s" || "$iniciar" == "S" ]]; then
            echo -e "${azul}Iniciando o servidor MCP...${reset}"
            echo -e "${amarelo}Pressione Ctrl+C para encerrar o servidor.${reset}"
            FB_APP_ID="$fb_app_id" FB_APP_SECRET="$fb_app_secret" FB_ACCESS_TOKEN="$fb_access_token" node index.js
        fi
    fi
else
    # Perguntar se deseja testar o servidor sem credenciais
    read -p "${amarelo}Deseja testar o servidor MCP sem credenciais? (s/n): ${reset}" testar
    if [[ "$testar" == "s" || "$testar" == "S" ]]; then
        echo -e "${azul}Testando o servidor MCP...${reset}"
        echo -e "${amarelo}Pressione Ctrl+C para encerrar o teste.${reset}"
        node index.js
    else
        echo -e "${azul}Você pode testar o servidor manualmente executando:${reset}"
        echo -e "${verde}cd /tmp/mcp_facebook && node index.js${reset}"
    fi
fi

echo -e "\n${roxo}Obrigado por usar o MCP Facebook Insights! 🚀${reset}"
