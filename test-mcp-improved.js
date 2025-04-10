#!/usr/bin/env node

/**
 * Script de teste para o servidor MCP Facebook Insights
 * 
 * Este script testa o servidor MCP Facebook Insights no formato n8n
 */

const { spawn } = require('child_process');
const path = require('path');

// Iniciar o servidor MCP
const server = spawn('node', [path.join(__dirname, 'index.js')], {
  env: {
    ...process.env,
    FB_APP_ID: process.env.FB_APP_ID || '1683244805894922',
    FB_APP_SECRET: process.env.FB_APP_SECRET || '27ac939cf46a7d8d28a8c1aa569cc0f9',
    FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN || 'EAAX65vi5swoBOz2TZABIlgKwGEC5Gdn4UV4bZAqXFC3ZCphZAOc5RP2QVDdjXmGk7vtCcJquAa3mZCTdsnLXo3ZA4zb6cHheNW6P1Vt48Xm11IqrIiRfmFBqxnygfzN5eB9ZAiAI5BgowWjsHglbPyP7TYf8YbvNjTpR20e0OaUCnzQumAQQgKaepdQeHtYuhZA9'
  }
});

// Coletar logs do servidor
server.stderr.on('data', (data) => {
  console.log(`Log: ${data.toString().trim()}`);
});

// Processar respostas do servidor
let responseBuffer = '';
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Tentar processar respostas completas em JSON
  try {
    // Verificar se temos uma resposta JSON completa
    const response = JSON.parse(responseBuffer);
    console.log('\nResposta do MCP:');
    console.log(JSON.stringify(response, null, 2));
    responseBuffer = '';
    
    // Se recebemos a mensagem "ready", iniciar os testes
    if (response.ready === true) {
      runTests();
    }
  } catch (e) {
    // Resposta incompleta, continuar coletando
  }
});

// Função para enviar uma mensagem para o servidor
function sendMessage(message) {
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Função para executar os testes
function runTests() {
  // Teste 1: Listar ferramentas
  console.log('\n1. Enviando requisição listTools no formato n8n...');
  sendMessage({ type: 'listTools' });
  
  // Aguardar um pouco antes do próximo teste
  setTimeout(() => {
    // Teste 2: Executar ferramenta
    console.log('\n2. Enviando requisição executeTool no formato n8n...');
    sendMessage({ 
      type: 'callTool',
      name: 'facebook-list-ad-accounts',
      arguments: {}
    });
    
    // Aguardar um pouco antes do próximo teste
    setTimeout(() => {
      // Teste 3: Executar ferramenta com parâmetros
      console.log('\n3. Enviando requisição executeTool com parâmetros...');
      sendMessage({ 
        type: 'callTool',
        name: 'facebook-account-info',
        arguments: {
          accountId: 'act_679107183449618'
        }
      });
      
      // Aguardar um pouco antes do próximo teste
      setTimeout(() => {
        // Teste 4: Executar ferramenta inexistente (teste de erro)
        console.log('\n4. Enviando requisição para ferramenta inexistente...');
        sendMessage({ 
          type: 'callTool',
          name: 'ferramenta-inexistente',
          arguments: {}
        });
        
        // Finalizar os testes após um tempo
        setTimeout(() => {
          console.log('\nEncerrando teste...');
          server.kill();
          process.exit(0);
        }, 5000);
      }, 5000);
    }, 5000);
  }, 5000);
}

// Lidar com erros do servidor
server.on('error', (error) => {
  console.error(`Erro no servidor: ${error.message}`);
  process.exit(1);
});

// Lidar com o encerramento do servidor
server.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Servidor encerrado com código: ${code}`);
    process.exit(code);
  }
});

// Lidar com sinais de interrupção
process.on('SIGINT', () => {
  console.log('\nInterrompendo teste...');
  server.kill();
  process.exit(0);
});
