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
2. Set the `VITE_OPENAI_API_KEY` in [.env.local](.env.local) to your OpenAI API key
3. Run the app:
   `npm run dev`

## Notas sobre logs de build
- As linhas que começam com timestamps (ex.: `2025-11-21T17:13:35Z`) indicam o pipeline automatizado clonando o repositório e executando os comandos configurados.
- A mensagem `Checking for configuration in a Wrangler configuration file (BETA)` apenas informa que o ambiente procurou um `wrangler.toml` (Cloudflare Workers) e não encontrou; não é erro.
- O aviso `npm warn deprecated node-domexception` vem de uma dependência transitiva e não bloqueia o build.
- O trecho `2 moderate severity vulnerabilities` é um relatório do `npm audit`; use `npm audit` ou `npm audit fix --force` se quiser revisar/atualizar dependências.
- Os erros `Cannot find module './components/Header'` etc. ocorreram porque o `src/App.tsx` importava componentes e serviços em caminhos relativos errados; foram corrigidos para apontar para `../components`, `../services` e `../types`, e o build (`npm run build`) agora completa com sucesso.

## Usando a VITE_OPENAI_API_KEY no Cloudflare Pages (passo a passo simples)
O app usa a API do ChatGPT (OpenAI) para gerar as frases e sintetiza o áudio apenas com **ElevenLabs** (voz Rachel, por padrão) quando a chave estiver configurada. As chaves precisam ser "queimadas" no código durante o build. Para garantir isso:

1) Abra **Cloudflare Pages → seu projeto → Settings → Environment Variables**. Em **Production**, crie (ou confirme) o item **Nome: `VITE_OPENAI_API_KEY` / Tipo: Secret / Valor: sua chave OpenAI**. Se preferir, mantenha também `VITE_API_KEY` como alias.
2) Ainda em **Production**, defina **`VITE_ELEVENLABS_API_KEY`** (Secret) para habilitar a voz Rachel da ElevenLabs. Opcionalmente você pode definir **`VITE_ELEVENLABS_VOICE_ID`** para usar outra voz.
3) Clique em **Deployments → Redeploy** ("Redeploy latest") para forçar um build novo já com as chaves.
4) Depois do deploy, teste o painel Admin. Se o botão "Gerar" não responder, abra o console do navegador: se aparecer `OpenAI API Key não encontrada`, a variável não chegou ao build (repita os passos 1 a 3).

_Dica rápida_: variáveis criadas em **Preview** não entram no build de **Production**. Verifique se está na aba certa.

### Voz do botão "Ouvir"
- O app usa apenas a voz **Rachel** (ou outra configurada) via ElevenLabs. Configure `VITE_ELEVENLABS_API_KEY` e, se quiser, `VITE_ELEVENLABS_VOICE_ID` para personalizar.
- Caso a ElevenLabs não esteja configurada ou retorne erro, o botão "Ouvir" permanece, mas não haverá áudio até que a chave seja fornecida.

### Se aparecer 429 / "insufficient_quota"
- A mensagem vem da OpenAI quando a chave usada não tem créditos liberados, mesmo que a conta mostre saldo (ex.: chave criada em projeto sem billing ativo ou com limite bloqueado).
- Opções rápidas: (1) gerar uma nova chave dentro do projeto que tem crédito e colocá-la em `VITE_OPENAI_API_KEY` + redeploy; (2) aceitar a frase local que o painel salva automaticamente quando detecta 429; (3) se quiser custo zero, trocar para um provedor com free tier e atualizar o serviço de IA.
- Após o primeiro 429, o app entra em modo "fallback": para de chamar a OpenAI e usa apenas frases locais até você publicar novamente com uma chave válida. Isso evita spam de erros no console e mantém o preenchimento da agenda funcionando.

#### Como reativar a OpenAI depois de liberar a cota
- Existe um cooldown automático de 10 minutos: depois desse tempo, o app volta a tentar chamadas à OpenAI sozinho.
- No painel Admin há o botão **"Tentar novamente agora"**, que remove o bloqueio imediatamente (útil após trocar a chave ou liberar billing) sem esperar o cooldown.
- Se voltar a receber 429, o bloqueio é reativado e o app segue usando frases locais para não parar a operação.

## Evitando frases repetidas
- Antes de gerar uma nova frase, o painel Admin agora lê todas as citações existentes no Supabase (agendadas, pendentes ou aprovadas) e envia essa lista ampliada (até 200 itens) como exclusão para a IA.
- O modelo foi ajustado para criar frases **originais** assinadas pela autora fixa **JURO**, reduzindo colisões de autoras conhecidas.
- Existe uma checagem final no Supabase: se a frase gerada já existir em qualquer data, o salvamento é bloqueado e uma nova geração é tentada automaticamente.
- Se mesmo assim a resposta vier duplicada, o app tenta novas gerações com listas expandidas e só salva quando encontra uma frase inédita.
