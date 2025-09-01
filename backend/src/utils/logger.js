const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            msg += '\n' + JSON.stringify(meta, null, 2);
        }

        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'student-event-management',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Write all logs with importance level of 'error' or higher to error.log
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
            tailable: true
        }),

        // Write all logs with importance level of 'info' or higher to combined.log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10,
            tailable: true
        }),

        // Separate file for API requests
        new winston.transports.File({
            filename: path.join(logDir, 'requests.log'),
            level: 'http',
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
            tailable: true
        }),

        // Security logs
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'warn',
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
            tailable: true
        })
    ],

    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 3
        })
    ],

    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 3
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Custom logging methods
class Logger {
    constructor(winstonLogger) {
        this.winston = winstonLogger;
    }

    // Standard logging methods
    debug(message, meta = {}) {
        this.winston.debug(message, meta);
    }

    info(message, meta = {}) {
        this.winston.info(message, meta);
    }

    warn(message, meta = {}) {
        this.winston.warn(message, meta);
    }

    error(message, meta = {}) {
        // If message is an Error object, extract stack trace
        if (message instanceof Error) {
            meta.stack = message.stack;
            meta.name = message.name;
            message = message.message;
        }

        this.winston.error(message, meta);
    }

    http(message, meta = {}) {
        this.winston.http(message, meta);
    }

    // Specialized logging methods
    security(message, meta = {}) {
        this.winston.warn(`[SECURITY] ${message}`, {
            ...meta,
            category: 'security',
            timestamp: new Date().toISOString()
        });
    }

    auth(message, meta = {}) {
        this.winston.info(`[AUTH] ${message}`, {
            ...meta,
            category: 'authentication',
            timestamp: new Date().toISOString()
        });
    }

    database(message, meta = {}) {
        this.winston.info(`[DATABASE] ${message}`, {
            ...meta,
            category: 'database',
            timestamp: new Date().toISOString()
        });
    }

    api(message, meta = {}) {
        this.winston.http(`[API] ${message}`, {
            ...meta,
            category: 'api',
            timestamp: new Date().toISOString()
        });
    }

    performance(message, meta = {}) {
        this.winston.info(`[PERFORMANCE] ${message}`, {
            ...meta,
            category: 'performance',
            timestamp: new Date().toISOString()
        });
    }

    audit(action, user, resource, meta = {}) {
        this.winston.info(`[AUDIT] ${action}`, {
            ...meta,
            category: 'audit',
            action,
            user: user?.userId || user?.id || user,
            resource,
            timestamp: new Date().toISOString(),
            ip: meta.ip,
            userAgent: meta.userAgent
        });
    }

    // Request logging middleware
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();

            // Log request
            this.http('Incoming request', {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentType: req.get('Content-Type'),
                contentLength: req.get('Content-Length'),
                user: req.user?.userId || 'anonymous'
            });

            // Log response when finished
            const originalEnd = res.end;
            res.end = function(chunk, encoding) {
                const duration = Date.now() - start;
                const responseSize = res.get('Content-Length') || 0;

                // Determine log level based on status code
                let level = 'http';
                if (res.statusCode >= 400 && res.statusCode < 500) {
                    level = 'warn';
                } else if (res.statusCode >= 500) {
                    level = 'error';
                }

                logger.winston.log(level, 'Request completed', {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    responseSize: `${responseSize} bytes`,
                    ip: req.ip,
                    user: req.user?.userId || 'anonymous'
                });

                originalEnd.call(this, chunk, encoding);
            };

            next();
        };
    }

    // Error logging with context
    logError(error, context = {}) {
        const errorInfo = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...context
        };

        this.error('Application error', errorInfo);
    }

    // Performance monitoring
    timeStart(label) {
        console.time(label);
    }

    timeEnd(label) {
        console.timeEnd(label);
    }

    // Memory usage logging
    logMemoryUsage() {
        const usage = process.memoryUsage();
        this.performance('Memory usage', {
            rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(usage.external / 1024 / 1024)} MB`
        });
    }

    // Database query logging
    logQuery(query, duration, error = null) {
        if (error) {
            this.error('Database query failed', {
                query: query.substr(0, 200) + (query.length > 200 ? '...' : ''),
                duration: `${duration}ms`,
                error: error.message
            });
        } else {
            this.database('Database query executed', {
                query: query.substr(0, 200) + (query.length > 200 ? '...' : ''),
                duration: `${duration}ms`
            });
        }
    }

    // User action logging
    logUserAction(action, userId, details = {}) {
        this.audit(action, userId, details.resource, {
            ...details,
            category: 'user_action'
        });
    }

    // System events
    logSystemEvent(event, details = {}) {
        this.info(`[SYSTEM] ${event}`, {
            ...details,
            category: 'system',
            event
        });
    }

    // Email logging
    logEmail(type, recipient, subject, status = 'sent') {
        this.info(`[EMAIL] ${type} email ${status}`, {
            type,
            recipient,
            subject,
            status,
            category: 'email'
        });
    }

    // Payment logging
    logPayment(action, amount, currency, userId, status = 'success') {
        this.info(`[PAYMENT] ${action}`, {
            action,
            amount,
            currency,
            userId,
            status,
            category: 'payment'
        });
    }

    // Notification logging
    logNotification(type, recipient, channel, status = 'sent') {
        this.info(`[NOTIFICATION] ${type} via ${channel}`, {
            type,
            recipient,
            channel,
            status,
            category: 'notification'
        });
    }

    // File operation logging
    logFileOperation(operation, filename, userId, size = null) {
        this.info(`[FILE] ${operation}`, {
            operation,
            filename,
            userId,
            size: size ? `${size} bytes` : null,
            category: 'file'
        });
    }

    // Cache logging
    logCache(operation, key, hit = null) {
        this.debug(`[CACHE] ${operation}`, {
            operation,
            key,
            hit,
            category: 'cache'
        });
    }

    // Rate limiting logging
    logRateLimit(ip, endpoint, limit) {
        this.warn(`[RATE_LIMIT] IP ${ip} exceeded rate limit for ${endpoint}`, {
            ip,
            endpoint,
            limit,
            category: 'rate_limit'
        });
    }

    // Search logging
    logSearch(query, userId, results = 0, duration = 0) {
        this.info(`[SEARCH] Query executed`, {
            query,
            userId,
            results,
            duration: `${duration}ms`,
            category: 'search'
        });
    }

    // Export logs
    async exportLogs(startDate, endDate, level = 'info') {
        return new Promise((resolve, reject) => {
            const options = {
                from: new Date(startDate),
                until: new Date(endDate),
                level: level,
                order: 'desc'
            };

            this.winston.query(options, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    // Get log statistics
    getLogStats() {
        const stats = {
            logLevel: this.winston.level,
            transports: this.winston.transports.length,
            logDirectory: logDir,
            memoryUsage: process.memoryUsage()
        };

        return stats;
    }

    // Cleanup old logs
    async cleanupLogs(daysToKeep = 30) {
        const fs = require('fs').promises;
        const logFiles = await fs.readdir(logDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        for (const file of logFiles) {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);

            if (stats.mtime < cutoffDate) {
                await fs.unlink(filePath);
                this.info(`Cleaned up old log file: ${file}`);
            }
        }
    }

    // Health check for logging system
    healthCheck() {
        try {
            this.info('Logger health check');
            return {
                status: 'healthy',
                level: this.winston.level,
                transports: this.winston.transports.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create and export logger instance
const appLogger = new Logger(logger);

// Schedule periodic cleanup (run daily)
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        appLogger.cleanupLogs(30).catch(error => {
            appLogger.error('Log cleanup failed', { error: error.message });
        });
    }, 24 * 60 * 60 * 1000); // 24 hours
}

// Schedule periodic memory usage logging
setInterval(() => {
    appLogger.logMemoryUsage();
}, 30 * 60 * 1000); // Every 30 minutes

module.exports = appLogger;