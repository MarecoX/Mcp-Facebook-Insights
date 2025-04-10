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

# Verificar se o diretório /tmp/mcp_facebook já existe
if [ -d "/tmp/mcp_facebook" ]; then
  print_warning "O diretório /tmp/mcp_facebook já existe."
  read -p "Deseja sobrescrever? (s/n): " sobrescrever
  if [[ "$sobrescrever" == "s" || "$sobrescrever" == "S" ]]; then
    print_message "Removendo diretório existente..."
    rm -rf /tmp/mcp_facebook
  else
    print_error "Instalação cancelada pelo usuário."
    exit 1
  fi
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

# Informações sobre configuração
print_message "Informações sobre configuração..."
echo ""
print_warning "As credenciais do Facebook são necessárias para o funcionamento do servidor MCP."
print_warning "Recomendamos configurar as credenciais diretamente no nó 'Execute Command' do n8n."
echo ""

# Definir porta padrão
PORT=8082

# Criar arquivo .env vazio apenas como referência
print_message "Criando arquivo .env de exemplo..."
cat > /tmp/mcp_facebook/.env.example << EOL
# Exemplo de configuração - NÃO PREENCHA ESTE ARQUIVO
# Configure estas variáveis no nó 'Execute Command' do n8n
FB_APP_ID=seu_app_id
FB_APP_SECRET=seu_app_secret
FB_ACCESS_TOKEN=seu_access_token
PORT=${PORT}
EOL

# Criar script de inicialização
print_message "Criando script de inicialização..."
cat > /tmp/mcp_facebook/start.sh << EOL
#!/bin/bash

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
echo "Command: node"
echo "Arguments: /tmp/mcp_facebook/index.js"
echo "Environment Variables:"
echo "FB_APP_ID=seu_app_id"
echo "FB_APP_SECRET=seu_app_secret"
echo "FB_ACCESS_TOKEN=seu_access_token"
echo "PORT=${PORT}  # opcional"
echo ""
print_message "Para usar o servidor MCP, configure um nó 'MCP Client' com:"
echo ""
echo "URL para listTools: http://localhost:${PORT}/tools"
echo "URL para executeTool: http://localhost:${PORT}/execute"
echo ""
print_message "Agora você pode usar o servidor MCP do Facebook Insights no n8n!"
echo ""

# Perguntar se deseja testar o servidor agora
read -p "Deseja testar o servidor MCP agora? (s/n): " START_SERVER
if [[ $START_SERVER == "s" || $START_SERVER == "S" ]]; then
  print_message "Iniciando servidor MCP para teste (pressione Ctrl+C para parar)..."
  print_warning "Lembre-se: Este é apenas um teste. Para uso real, configure o servidor no n8n."
  cd /tmp/mcp_facebook
  node index.js
else
  print_message "Você pode testar o servidor manualmente executando:"
  echo "cd /tmp/mcp_facebook && node index.js"
fi
