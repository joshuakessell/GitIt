/**
 * Logger utility for structured logging in production and development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction: boolean;
  
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: string, data?: any): void {
    if (!this.isProduction) {
      this.log('debug', message, context, data);
    }
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: string, data?: any): void {
    this.log('info', message, context, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data);
  }

  /**
   * Log an error with stack trace
   */
  error(message: string, error?: Error, context?: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      data
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack
      };
    }

    this.writeLog(logEntry);
  }

  /**
   * Create and write a log entry
   */
  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data
    };

    this.writeLog(logEntry);
  }

  /**
   * Write the log entry to the appropriate destination
   */
  private writeLog(logEntry: LogEntry): void {
    // In production, we'd typically write to a file or external logging service
    // For now, we'll just format and console log
    
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',  // Reset
    };
    
    const levelColor = colors[logEntry.level] || colors.reset;
    
    if (this.isProduction) {
      // In production, log structured JSON for better parsing
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, pretty-print for readability
      const contextStr = logEntry.context ? ` [${logEntry.context}]` : '';
      console.log(
        `${levelColor}${logEntry.level.toUpperCase()}${colors.reset} ${logEntry.timestamp}${contextStr}: ${logEntry.message}`
      );
      
      if (logEntry.data) {
        console.log('Data:', logEntry.data);
      }
      
      if (logEntry.error) {
        console.error(`${colors.error}${logEntry.error.name}: ${logEntry.error.message}${colors.reset}`);
        if (logEntry.error.stack) {
          console.error(logEntry.error.stack);
        }
      }
    }
  }
}

// Export a singleton instance
export const logger = new Logger();