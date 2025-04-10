# Obtendo Credenciais do Facebook

Este guia explica como obter as credenciais necessárias para usar o servidor MCP do Facebook Insights.

## Pré-requisitos

- Conta no Facebook
- Conta de desenvolvedor do Facebook

## Passos para obter as credenciais

### 1. Criar uma conta de desenvolvedor do Facebook

1. Acesse [Facebook for Developers](https://developers.facebook.com/)
2. Clique em "Começar" ou "Get Started"
3. Siga as instruções para criar uma conta de desenvolvedor

### 2. Criar um aplicativo do Facebook

1. Acesse o [Painel de Desenvolvedor do Facebook](https://developers.facebook.com/apps/)
2. Clique em "Criar Aplicativo"
3. Selecione o tipo de aplicativo "Negócios"
4. Preencha as informações necessárias e clique em "Criar Aplicativo"

### 3. Adicionar o produto "Marketing API"

1. No painel do seu aplicativo, clique em "Adicionar Produtos"
2. Encontre "Marketing API" e clique em "Configurar"

### 4. Obter o App ID e App Secret

1. No painel do seu aplicativo, vá para "Configurações" > "Básico"
2. Aqui você encontrará o "ID do Aplicativo" (App ID) e o "Segredo do Aplicativo" (App Secret)
3. Anote esses valores para usar no servidor MCP

### 5. Gerar um token de acesso

1. No painel do seu aplicativo, vá para "Ferramentas" > "Explorador de API do Graph"
2. Selecione seu aplicativo no menu suspenso
3. Selecione as permissões necessárias:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `public_profile`
4. Clique em "Gerar Token de Acesso"
5. Anote o token gerado para usar no servidor MCP

## Permissões necessárias

Para usar todas as funcionalidades do servidor MCP do Facebook Insights, você precisa das seguintes permissões:

- `ads_management`: Para gerenciar campanhas publicitárias
- `ads_read`: Para ler informações sobre anúncios
- `business_management`: Para acessar informações de negócios
- `public_profile`: Para acessar informações públicas do perfil

## Configurando as credenciais no servidor MCP

Use as credenciais obtidas para configurar o servidor MCP:

```bash
export FB_APP_ID=seu_app_id
export FB_APP_SECRET=seu_app_secret
export FB_ACCESS_TOKEN=seu_access_token
```

Ou, se estiver usando o n8n, configure as variáveis de ambiente no nó "Execute Command":

```
FB_APP_ID=seu_app_id
FB_APP_SECRET=seu_app_secret
FB_ACCESS_TOKEN=seu_access_token
```

## Solução de problemas

### Token expirado

Os tokens de acesso do Facebook podem expirar. Se você receber um erro de autenticação, tente gerar um novo token de acesso.

### Permissões insuficientes

Se você receber um erro de permissão, verifique se o token de acesso tem todas as permissões necessárias.

### Conta de anúncios não encontrada

Certifique-se de que a conta de anúncios que você está tentando acessar está associada à sua conta do Facebook e que você tem permissão para acessá-la.
