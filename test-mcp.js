#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Caminho para o script MCP
const mcpScriptPath = path.join(__dirname, 'index.js');

// Iniciar o processo MCP
const mcpProcess = spawn('node', [mcpScriptPath], {
  stdio: ['pipe', 'pipe', 'pipe']
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
  console.error('Erro:', data.toString());
});

// Enviar requisição listTools
setTimeout(() => {
  console.log('Enviando requisição listTools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'listTools'
  };
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Simular o que o n8n está enviando
  setTimeout(() => {
    console.log('\nEnviando requisição listTools no formato n8n...');
    const n8nRequest = { type: 'listTools' };
    mcpProcess.stdin.write(JSON.stringify(n8nRequest) + '\n');

    // Testar execução da ferramenta facebook-list-ad-accounts
    setTimeout(() => {
      console.log('\nEnviando requisição executeTool para facebook-list-ad-accounts...');
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

      // Testar execução no formato n8n
      setTimeout(() => {
        console.log('\nEnviando requisição executeTool no formato n8n...');
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

// Encerrar o processo após 15 segundos
setTimeout(() => {
  console.log('Encerrando teste...');
  mcpProcess.kill();
  process.exit(0);
}, 15000);
