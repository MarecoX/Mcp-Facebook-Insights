#!/bin/bash

# Auto-instalador para MCP Facebook Insights no n8n/Portainer
# Este script deve ser executado dentro do contêiner n8n

# Cores para saída
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir mensagens
print_message() {
  echo -e "${BLUE}[MCP-INSTALLER]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  print_warning "Não está rodando como root. Algumas operações podem falhar."
fi

# Verificar se o diretório /tmp existe
if [ ! -d "/tmp" ]; then
  print_error "Diretório /tmp não encontrado. Verifique seu ambiente."
  exit 1
fi

# Criar diretório para o MCP Facebook Insights
print_message "Criando diretório para o MCP Facebook Insights..."
mkdir -p /tmp/mcp_facebook

# Verificar se o git está instalado
if ! command -v git &> /dev/null; then
  print_warning "Git não encontrado. Tentando baixar usando curl..."
  
  # Verificar se o curl está instalado
  if ! command -v curl &> /dev/null; then
    print_error "Nem git nem curl estão instalados. Não é possível baixar o código."
    print_message "Tente instalar o git ou curl primeiro, ou baixe manualmente os arquivos."
    exit 1
  fi
  
  # Baixar arquivos usando curl
  print_message "Baixando arquivos usando curl..."
  curl -L -o /tmp/mcp_facebook_main.zip https://github.com/MarecoX/mcp-facebook-insights/archive/refs/heads/main.zip
  
  # Verificar se o unzip está instalado
  if ! command -v unzip &> /dev/null; then
    print_error "unzip não está instalado. Não é possível extrair o arquivo zip."
    exit 1
  fi
  
  # Extrair arquivos
  print_message "Extraindo arquivos..."
  unzip -q /tmp/mcp_facebook_main.zip -d /tmp
  
  # Mover arquivos para o diretório correto
  cp -r /tmp/mcp-facebook-insights-main/* /tmp/mcp_facebook/
  
  # Limpar arquivos temporários
  rm -rf /tmp/mcp_facebook_main.zip /tmp/mcp-facebook-insights-main
else
  # Baixar código do GitHub usando git
  print_message "Baixando código do GitHub..."
  git clone https://github.com/MarecoX/mcp-facebook-insights.git /tmp/mcp_facebook_temp
  
  # Mover arquivos para o diretório correto
  cp -r /tmp/mcp_facebook_temp/* /tmp/mcp_facebook/
  
  # Limpar diretório temporário
  rm -rf /tmp/mcp_facebook_temp
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
  print_error "npm não encontrado. Não é possível instalar as dependências."
  print_message "Tente instalar o npm primeiro, ou instale as dependências manualmente."
  exit 1
fi

# Instalar dependências
print_message "Instalando dependências..."
cd /tmp/mcp_facebook
npm install

# Solicitar credenciais do Facebook
print_message "Configurando credenciais do Facebook..."
echo ""
print_warning "As credenciais do Facebook são necessárias para o funcionamento do servidor MCP."
echo ""

read -p "Digite seu Facebook App ID: " FB_APP_ID
read -p "Digite seu Facebook App Secret: " FB_APP_SECRET
read -p "Digite seu Facebook Access Token: " FB_ACCESS_TOKEN
read -p "Digite a porta para o servidor MCP (padrão: 8082): " PORT
PORT=${PORT:-8082}

# Criar arquivo .env
print_message "Criando arquivo .env..."
cat > /tmp/mcp_facebook/.env << EOL
FB_APP_ID=${FB_APP_ID}
FB_APP_SECRET=${FB_APP_SECRET}
FB_ACCESS_TOKEN=${FB_ACCESS_TOKEN}
PORT=${PORT}
EOL

# Criar script de inicialização
print_message "Criando script de inicialização..."
cat > /tmp/mcp_facebook/start.sh << EOL
#!/bin/bash

# Carregar variáveis de ambiente
if [ -f "/tmp/mcp_facebook/.env" ]; then
  export \$(cat /tmp/mcp_facebook/.env | grep -v '^#' | xargs)
fi

# Iniciar servidor MCP
cd /tmp/mcp_facebook
node index.js
EOL

# Tornar script executável
chmod +x /tmp/mcp_facebook/start.sh

# Instruções para configurar o n8n
print_success "Instalação concluída com sucesso!"
echo ""
print_message "Para iniciar o servidor MCP, configure um nó 'Execute Command' no n8n com:"
echo ""
echo "Command: bash"
echo "Arguments: /tmp/mcp_facebook/start.sh"
echo ""
print_message "Para usar o servidor MCP, configure um nó 'MCP Client' com:"
echo ""
echo "URL para listTools: http://localhost:${PORT}/tools"
echo "URL para executeTool: http://localhost:${PORT}/execute"
echo ""
print_message "Agora você pode usar o servidor MCP do Facebook Insights no n8n!"
echo ""
print_warning "Lembre-se de que as credenciais do Facebook estão armazenadas em /tmp/mcp_facebook/.env"
echo ""

# Perguntar se deseja iniciar o servidor agora
read -p "Deseja iniciar o servidor MCP agora? (s/n): " START_SERVER
if [[ $START_SERVER == "s" || $START_SERVER == "S" ]]; then
  print_message "Iniciando servidor MCP..."
  bash /tmp/mcp_facebook/start.sh
else
  print_message "Você pode iniciar o servidor manualmente executando:"
  echo "bash /tmp/mcp_facebook/start.sh"
fi
