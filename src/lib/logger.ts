import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function getTimestamp(): string {
  return new Date().toISOString();
}

function getLogFilePath(): string {
  const date = new Date();
  const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
  return path.join(LOG_DIR, fileName);
}

function formatLogMessage(level: LogLevel, message: string, details?: any): string {
  const timestamp = getTimestamp();
  const detailsStr = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${detailsStr}\n`;
}

function writeToLog(message: string): void {
  const logFile = getLogFilePath();
  fs.appendFileSync(logFile, message);
}

export const logger = {
  info: (message: string, details?: any) => {
    const logMessage = formatLogMessage('info', message, details);
    writeToLog(logMessage);
    console.info(message, details);
  },

  warn: (message: string, details?: any) => {
    const logMessage = formatLogMessage('warn', message, details);
    writeToLog(logMessage);
    console.warn(message, details);
  },

  error: (message: string, error?: Error | any) => {
    const details = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      ...error
    } : error;
    
    const logMessage = formatLogMessage('error', message, details);
    writeToLog(logMessage);
    console.error(message, error);
  },

  debug: (message: string, details?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = formatLogMessage('debug', message, details);
      writeToLog(logMessage);
      console.debug(message, details);
    }
  }
};