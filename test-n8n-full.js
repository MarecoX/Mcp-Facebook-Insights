#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Caminho para o script MCP
const mcpScriptPath = path.join('/home/bazzite/mcp_facebook', 'index.js');

// Iniciar o processo MCP
const mcpProcess = spawn('node', [mcpScriptPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    FB_APP_ID: '1683244805894922',
    FB_APP_SECRET: '27ac939cf46a7d8d28a8c1aa569cc0f9',
    FB_ACCESS_TOKEN: 'EAAX65vi5swoBOz2TZABIlgKwGEC5Gdn4UV4bZAqXFC3ZCphZAOc5RP2QVDdjXmGk7vtCcJquAa3mZCTdsnLXo3ZA4zb6cHheNW6P1Vt48Xm11IqrIiRfmFBqxnygfzN5eB9ZAiAI5BgowWjsHglbPyP7TYf8YbvNjTpR20e0OaUCnzQumAQQgKaepdQeHtYuhZA9'
  }
});

// Capturar saída padrão
mcpProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('Resposta do MCP:');
    console.log(JSON.stringify(response, null, 2));
    
    // Simular o comportamento do n8n
    if (Array.isArray(response) && response.length > 0) {
      if (response[0].name && response[0].description && response[0].inputSchema) {
        console.log('\n✅ Resposta de listTools válida para n8n');
        
        // Verificar se há ferramentas disponíveis
        if (response.length > 0) {
          console.log(`Encontradas ${response.length} ferramentas disponíveis`);
        }
      } else if (response[0].content) {
        console.log('\n✅ Resposta de callTool válida para n8n');
        
        // Verificar se é um erro
        if (response[0].isError) {
          console.log('⚠️ Erro retornado: ' + response[0].content[0].text);
        } else {
          console.log('Conteúdo retornado com sucesso');
        }
      }
    } else if (response.ready === true) {
      console.log('\n✅ Servidor MCP pronto');
    }
  } catch (error) {
    console.log('Saída (não é JSON válido):', data.toString());
  }
});

// Capturar saída de erro
mcpProcess.stderr.on('data', (data) => {
  console.error('Log:', data.toString());
});

// Sequência de testes
const runTests = async () => {
  // Esperar o servidor iniciar
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 1: listTools
  console.log('\n1. Enviando requisição listTools no formato n8n...');
  const n8nListToolsRequest = { type: 'listTools' };
  mcpProcess.stdin.write(JSON.stringify(n8nListToolsRequest) + '\n');
  
  // Esperar a resposta
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 2: callTool válido
  console.log('\n2. Enviando requisição callTool para facebook-list-ad-accounts...');
  const n8nExecuteRequest = {
    type: 'callTool',
    name: 'facebook-list-ad-accounts',
    arguments: {}
  };
  mcpProcess.stdin.write(JSON.stringify(n8nExecuteRequest) + '\n');
  
  // Esperar a resposta
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 3: callTool inválido
  console.log('\n3. Enviando requisição callTool para ferramenta inexistente...');
  const invalidToolRequest = {
    type: 'callTool',
    name: 'ferramenta-inexistente',
    arguments: {}
  };
  mcpProcess.stdin.write(JSON.stringify(invalidToolRequest) + '\n');
  
  // Esperar a resposta e encerrar
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\nTodos os testes concluídos!');
  mcpProcess.kill();
  process.exit(0);
};

// Iniciar os testes
runTests();
