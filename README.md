# ✨ Inspiração Diária - JURO

Um aplicativo SaaS (Software as a Service) focado em entregar doses diárias de inspiração protagonizadas por mulheres notáveis da história e da atualidade.

![Status](https://img.shields.io/badge/Status-Production-green)
![Tech](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Tailwind%20%7C%20Gemini%20AI-pink)

## 🚀 Funcionalidades

- **Curadoria IA**: Utiliza Google Gemini 2.5 Flash para gerar frases autênticas e verificar fatos.
- **Áudio Neural**: Integração com ElevenLabs para leitura em voz alta das frases.
- **Fallback Visual Inteligente**: Sistema híbrido que suporta logos em PNG e SVG via código para garantir identidade visual.
- **Painel Administrativo**: Área restrita para aprovação, edição e agendamento de frases (Fila de 30 dias).
- **Interatividade**: Sistema de reações (Amei, Poderosa, Tocante) e compartilhamento via WhatsApp.

## 🛠️ Tecnologias

- **Frontend**: React 19, Vite, TypeScript
- **Estilização**: Tailwind CSS
- **AI & Dados**: Google GenAI SDK, Supabase
- **Ícones**: Lucide React

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/inspiracao-diaria.git
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (`.env`):
```env
VITE_API_KEY=sua_chave_gemini
VITE_ELEVENLABS_API_KEY=sua_chave_elevenlabs
VITE_ADMIN_PASSWORD=sua_senha_admin
```

4. Rode o projeto:
```bash
npm run dev
```

## 🎨 Design System (JURO)

- **Primária**: `#E9568D` (Rosa Intenso)
- **Secundária**: `#FBCFE8` (Rosa Suave)
- **Fundo**: `#FFF5F8` (Off-white Rosado)
- **Tipografia**: Playfair Display (Serifa) & Inter (Sans)

---
Feito com 💖 pela equipe JURO.
