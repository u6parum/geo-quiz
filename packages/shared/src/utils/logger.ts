export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  event: (event: string, data?: any) => {
    console.log(`[EVENT] ${event}`, data ? JSON.stringify(data).slice(0, 100) : '');
  },
};
