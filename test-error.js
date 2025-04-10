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
  } catch (error) {
    console.log('Saída (não é JSON válido):', data.toString());
  }
});

// Capturar saída de erro
mcpProcess.stderr.on('data', (data) => {
  console.error('Log:', data.toString());
});

// Testar ferramenta inexistente
setTimeout(() => {
  console.log('\nEnviando requisição para ferramenta inexistente...');
  const invalidToolRequest = {
    type: 'callTool',
    name: 'ferramenta-inexistente',
    arguments: {}
  };
  mcpProcess.stdin.write(JSON.stringify(invalidToolRequest) + '\n');
}, 2000);

// Encerrar o processo após 5 segundos
setTimeout(() => {
  console.log('\nEncerrando teste...');
  mcpProcess.kill();
  process.exit(0);
}, 5000);
