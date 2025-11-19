import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Filter out browser extension errors (like supercopy-v3, shopimgs, etc.)
const originalError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args.join(' ');
  // Filter out known browser extension errors
  if (
    errorMessage.includes('shopimgs.com') ||
    errorMessage.includes('supercopy-v3') ||
    errorMessage.includes('cdn.shopimgs.com') ||
    errorMessage.includes('Failed to fetch') && errorMessage.includes('shopimgs')
  ) {
    // Silently ignore browser extension errors
    return;
  }
  // Log all other errors normally
  originalError.apply(console, args);
};

// Filter out unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || String(event.reason || '');
  if (
    errorMessage.includes('shopimgs.com') ||
    errorMessage.includes('supercopy-v3') ||
    errorMessage.includes('cdn.shopimgs.com')
  ) {
    event.preventDefault(); // Prevent the error from showing in console
    return;
  }
});

// Filter out general errors from extensions
window.addEventListener('error', (event) => {
  const errorMessage = event.message || '';
  const errorSource = event.filename || '';
  if (
    errorMessage.includes('shopimgs.com') ||
    errorMessage.includes('supercopy-v3') ||
    errorMessage.includes('cdn.shopimgs.com') ||
    errorSource.includes('shopimgs.com') ||
    errorSource.includes('supercopy')
  ) {
    event.preventDefault(); // Prevent the error from showing in console
    return;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
