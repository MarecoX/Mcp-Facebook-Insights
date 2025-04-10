#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Caminho para o script MCP
const mcpScriptPath = path.join(__dirname, 'index.js');

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
  } catch (error) {
    console.log('Saída (não é JSON válido):', data.toString());
  }
});

// Capturar saída de erro
mcpProcess.stderr.on('data', (data) => {
  console.error('Log:', data.toString());
});

// Testar listTools
setTimeout(() => {
  console.log('\n1. Enviando requisição listTools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'listTools'
  };
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Testar listTools no formato n8n
  setTimeout(() => {
    console.log('\n2. Enviando requisição listTools no formato n8n...');
    const n8nListToolsRequest = { type: 'listTools' };
    mcpProcess.stdin.write(JSON.stringify(n8nListToolsRequest) + '\n');
    
    // Testar executeTool para facebook-list-ad-accounts
    setTimeout(() => {
      console.log('\n3. Enviando requisição executeTool para facebook-list-ad-accounts...');
      const executeRequest = {
        jsonrpc: '2.0',
        id: '2',
        method: 'executeTool',
        params: {
          name: 'facebook-list-ad-accounts',
          arguments: {}
        }
      };
      mcpProcess.stdin.write(JSON.stringify(executeRequest) + '\n');
      
      // Testar executeTool no formato n8n
      setTimeout(() => {
        console.log('\n4. Enviando requisição executeTool no formato n8n...');
        const n8nExecuteRequest = {
          type: 'callTool',
          name: 'facebook-list-ad-accounts',
          arguments: {}
        };
        mcpProcess.stdin.write(JSON.stringify(n8nExecuteRequest) + '\n');
      }, 1000);
    }, 1000);
  }, 1000);
}, 1000);

// Encerrar o processo após 10 segundos
setTimeout(() => {
  console.log('\nEncerrando teste...');
  mcpProcess.kill();
  process.exit(0);
}, 10000);
