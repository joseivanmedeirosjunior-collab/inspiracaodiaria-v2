interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  readonly VITE_ELEVENLABS_API_KEY?: string;
  readonly ELEVENLABS_API_KEY?: string;
  readonly VITE_ELEVENLABS_VOICE_ID?: string;
  readonly ELEVENLABS_VOICE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}