<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15c-DOz5jh9HyHFkRvPVLC3lKYz9TCpcY

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Notas sobre logs de build
- As linhas que começam com timestamps (ex.: `2025-11-21T17:13:35Z`) indicam o pipeline automatizado clonando o repositório e executando os comandos configurados.
- A mensagem `Checking for configuration in a Wrangler configuration file (BETA)` apenas informa que o ambiente procurou um `wrangler.toml` (Cloudflare Workers) e não encontrou; não é erro.
- O aviso `npm warn deprecated node-domexception` vem de uma dependência transitiva e não bloqueia o build.
- O trecho `2 moderate severity vulnerabilities` é um relatório do `npm audit`; use `npm audit` ou `npm audit fix --force` se quiser revisar/atualizar dependências.
- Os erros `Cannot find module './components/Header'` etc. ocorreram porque o `src/App.tsx` importava componentes e serviços em caminhos relativos errados; foram corrigidos para apontar para `../components`, `../services` e `../types`, e o build (`npm run build`) agora completa com sucesso.

## Usando a VITE_API_KEY no Cloudflare Pages (passo a passo simples)
O app só gera frases se a chave de API for "queimada" no código durante o build. Isso acontece automaticamente **quando o Pages recebe a variável `VITE_API_KEY` no momento do build**. Se ela não chegar nessa hora, o botão de gerar fica bloqueado. Para garantir que funcione:

1) Abra **Cloudflare Pages → seu projeto → Settings → Environment Variables**. Em **Production**, crie (ou confirme) o item **Nome: `VITE_API_KEY` / Tipo: Secret / Valor: sua chave**. Se já existe, apenas salve/feche.
2) Clique em **Deployments → Redeploy** (escolha "Redeploy latest"). Esse rebuild é o que injeta a variável no bundle que vai para o navegador.
3) Depois do deploy concluir, abra o app. Se algo falhar, abra o Console do navegador: se aparecer `Gemini Service - API Key detectada: false`, o build ainda não recebeu a variável (volte e repita o passo 1 + redeploy).

_Dica rápida_: variáveis criadas em **Preview** não entram no build de **Production**. Verifique se está na aba certa.
