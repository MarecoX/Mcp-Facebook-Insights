#!/bin/bash

# Cores para output
verde="\e[32m"
vermelho="\e[31m"
amarelo="\e[33m"
azul="\e[34m"
reset="\e[0m"

echo -e "${azul}Testando script de instalação...${reset}"

# Criar diretório temporário para teste
echo -e "${azul}Criando diretório temporário para teste...${reset}"
TEST_DIR="/tmp/test-mcp-facebook-install"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR" || exit 1

# Baixar script de instalação
echo -e "${azul}Baixando script de instalação...${reset}"
curl -s https://raw.githubusercontent.com/MarecoX/mcp-facebook-insights/main/auto-install.sh > auto-install.sh
chmod +x auto-install.sh

# Executar script de instalação
echo -e "${azul}Executando script de instalação...${reset}"
./auto-install.sh

# Verificar se a instalação foi bem-sucedida
echo -e "${azul}Verificando instalação...${reset}"

# Verificar diretório do usuário
USER_DIR="$HOME/mcp_facebook"

if [ -d "$USER_DIR" ] && [ -f "$USER_DIR/index.js" ]; then
  echo -e "${verde}Instalação bem-sucedida no diretório do usuário!${reset}"
  echo -e "${azul}Conteúdo do diretório $USER_DIR:${reset}"
  ls -la "$USER_DIR"
elif [ -d "/opt/mcp_facebook" ] && [ -f "/opt/mcp_facebook/index.js" ]; then
  echo -e "${verde}Instalação bem-sucedida no diretório /opt!${reset}"
  echo -e "${azul}Conteúdo do diretório /opt/mcp_facebook:${reset}"
  ls -la /opt/mcp_facebook
else
  echo -e "${vermelho}Instalação falhou!${reset}"
  echo -e "${azul}Verificando diretórios possíveis:${reset}"
  echo -e "${azul}Diretório do usuário ($USER_DIR):${reset}"
  ls -la "$USER_DIR" 2>/dev/null || echo -e "${vermelho}Diretório não encontrado${reset}"
  echo -e "${azul}Diretório /opt/mcp_facebook:${reset}"
  ls -la /opt/mcp_facebook 2>/dev/null || echo -e "${vermelho}Diretório não encontrado${reset}"
fi

# Limpar diretório temporário
echo -e "${azul}Limpando diretório temporário...${reset}"
cd /tmp
rm -rf "$TEST_DIR"

echo -e "${azul}Teste concluído!${reset}"
