const { spawn } = require('child_process');
const path = require('path');

// Iniciar o servidor MCP
const serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    FB_APP_ID: '1683244805894922',
    FB_APP_SECRET: '27ac939cf46a7d8d28a8c1aa569cc0f9',
    FB_ACCESS_TOKEN: 'EAAX65vi5swoBOz2TZABIlgKwGEC5Gdn4UV4bZAqXFC3ZCphZAOc5RP2QVDdjXmGk7vtCcJquAa3mZCTdsnLXo3ZA4zb6cHheNW6P1Vt48Xm11IqrIiRfmFBqxnygfzN5eB9ZAiAI5BgowWjsHglbPyP7TYf8YbvNjTpR20e0OaUCnzQumAQQgKaepdQeHtYuhZA9'
  }
});

// Capturar saída do servidor
serverProcess.stdout.on('data', (data) => {
  console.log(`Servidor stdout: ${data}`);

  // Verificar se há um objeto JSON na saída
  try {
    const jsonStr = data.toString().trim();
    console.log(`Recebido: ${jsonStr}`);
    const response = JSON.parse(jsonStr);

    if (response.ready === true) {
      console.log('Servidor está pronto. Enviando requisição listTools...');
      serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'listTools'
      }) + '\n');
    } else if (response.result && response.result.jsonrpc === '2.0' && response.result.result && response.result.result.tools) {
      console.log('✅ Teste bem-sucedido! O método listTools funciona corretamente.');
      console.log(`Ferramentas disponíveis: ${response.result.result.tools.map(t => t.name).join(', ')}`);

      // Encerrar o processo após o teste
      setTimeout(() => {
        serverProcess.kill();
        process.exit(0);
      }, 1000);
    } else if (response.jsonrpc === '2.0' && response.result && response.result.tools) {
      console.log('✅ Teste bem-sucedido! O método listTools funciona corretamente.');
      console.log(`Ferramentas disponíveis: ${response.result.tools.map(t => t.name).join(', ')}`);

      // Encerrar o processo após o teste
      setTimeout(() => {
        serverProcess.kill();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error(`Erro ao analisar JSON: ${error.message}`);
    // Ignorar erros de parsing JSON
  }
});

// Capturar erros do servidor
serverProcess.stderr.on('data', (data) => {
  console.error(`Servidor stderr: ${data}`);

  // Verificar se o servidor está pronto
  if (data.toString().includes('Servidor MCP do Facebook Insights iniciado em modo STDIO')) {
    console.log('Servidor está pronto (detectado em stderr). Enviando requisição listTools...');
    serverProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'listTools'
    }) + '\n');
  }
});

// Lidar com encerramento do servidor
serverProcess.on('close', (code) => {
  console.log(`Servidor encerrado com código ${code}`);
});

// Encerrar o teste após 10 segundos se não houver resposta
setTimeout(() => {
  console.error('❌ Teste falhou: Timeout ao aguardar resposta do servidor.');
  serverProcess.kill();
  process.exit(1);
}, 10000);
