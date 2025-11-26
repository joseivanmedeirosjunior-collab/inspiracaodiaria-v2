/* /// <reference types="vite/client" /> */
/**
 * Fix: Manually declare modules and interfaces to resolve "Cannot find type definition file for 'vite/client'" error.
 * This ensures the project compiles even if the vite types are not correctly linked in the environment.
 */

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

declare module '*.ico' {
  const value: string;
  export default value;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_ADMIN_PASSWORD?: string
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
