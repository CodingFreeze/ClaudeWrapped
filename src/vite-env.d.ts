/// <reference types="vite/client" />

// `webkitdirectory` is non-standard and missing from React's HTMLInputElement types.
declare namespace React {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}
