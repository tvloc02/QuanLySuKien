require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import configurations
const database = require('./config/database');
const redisClient = require('./config/redis');
const logger = require('./utils/logger');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const searchRoutes = require('./routes/search');

class Server {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.port = process.env.PORT || 5000;
    }

    async initialize() {
        try {
            // Connect to databases
            await this.connectDatabases();

            // Setup middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handling
            this.setupErrorHandling();

            // Setup Socket.IO
            this.setupSocketIO();

            // Start server
            await this.startServer();

        } catch (error) {
            logger.error('Server initialization failed:', error);
            process.exit(1);
        }
    }

    async connectDatabases() {
        logger.info('Connecting to databases...');

        try {
            // Connect to MongoDB
            await database.connect();

            // Connect to Redis
            await redisClient.connect();

            logger.info('All databases connected successfully');
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    setupMiddleware() {
        logger.info('Setting up middleware...');

        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false
        }));

        // CORS configuration
        const corsOptions = {
            origin: function (origin, callback) {
                const allowedOrigins = process.env.ALLOWED_ORIGINS
                    ? process.env.ALLOWED_ORIGINS.split(',')
                    : ['http://localhost:3000', 'http://localhost:3001'];

                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);

                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };
        this.app.use(cors(corsOptions));

        // Compression
        this.app.use(compression());

        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        const logFormat = process.env.NODE_ENV === 'production'
            ? 'combined'
            : 'dev';
        this.app.use(morgan(logFormat, {
            stream: {
                write: (message) => logger.info(message.trim())
            }
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later'
            },
            standardHeaders: true,
            legacyHeaders: false,
            // Skip rate limiting for certain paths
            skip: (req) => {
                const skipPaths = ['/api/v1/health', '/api/v1/status'];
                return skipPaths.includes(req.path);
            }
        });
        this.app.use(limiter);

        // Trust proxy (for accurate IP addresses behind load balancer)
        this.app.set('trust proxy', 1);

        // Static files
        this.app.use('/uploads', express.static('uploads'));

        logger.info('Middleware setup completed');
    }

    setupRoutes() {
        logger.info('Setting up routes...');

        const apiPrefix = process.env.API_PREFIX || '/api/v1';

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'Server is running',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API status
        this.app.get(`${apiPrefix}/status`, async (req, res) => {
            const status = {
                server: 'online',
                database: database.isConnected() ? 'connected' : 'disconnected',
                redis: 'connected', // Redis connection check would go here
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: status
            });
        });

        // API routes
        this.app.use(`${apiPrefix}/auth`, authRoutes);
        this.app.use(`${apiPrefix}/events`, eventRoutes);
        this.app.use(`${apiPrefix}/users`, userRoutes);
        this.app.use(`${apiPrefix}/admin`, adminRoutes);
        this.app.use(`${apiPrefix}/notifications`, notificationRoutes);
        this.app.use(`${apiPrefix}/reports`, reportRoutes);
        this.app.use(`${apiPrefix}/search`, searchRoutes);

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        });

        logger.info('Routes setup completed');
    }

    setupErrorHandling() {
        logger.info('Setting up error handling...');

        // Global error handler
        this.app.use(errorHandler);

        // Unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Close server & exit process
            this.server.close(() => {
                process.exit(1);
            });
        });

        // Uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            this.gracefulShutdown();
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received. Shutting down gracefully...');
            this.gracefulShutdown();
        });

        logger.info('Error handling setup completed');
    }

    setupSocketIO() {
        logger.info('Setting up Socket.IO...');

        this.io.on('connection', (socket) => {
            logger.info(`User connected: ${socket.id}`);

            // Join user to their personal room
            socket.on('join_user_room', (userId) => {
                socket.join(`user_${userId}`);
                logger.info(`User ${userId} joined personal room`);
            });

            // Join event room
            socket.on('join_event_room', (eventId) => {
                socket.join(`event_${eventId}`);
                logger.info(`User joined event room: ${eventId}`);
            });

            // Leave event room
            socket.on('leave_event_room', (eventId) => {
                socket.leave(`event_${eventId}`);
                logger.info(`User left event room: ${eventId}`);
            });

            // Handle real-time check-ins
            socket.on('checkin_update', (data) => {
                socket.to(`event_${data.eventId}`).emit('user_checked_in', data);
            });

            // Handle real-time notifications
            socket.on('notification_read', (notificationId) => {
                // Update notification as read in database
                // Emit to admin dashboard if needed
            });

            socket.on('disconnect', () => {
                logger.info(`User disconnected: ${socket.id}`);
            });

            socket.on('error', (error) => {
                logger.error('Socket.IO error:', error);
            });
        });

        // Make io accessible to other parts of the app
        this.app.set('io', this.io);

        logger.info('Socket.IO setup completed');
    }

    async startServer() {
        try {
            this.server.listen(this.port, () => {
                logger.info(`🚀 Server running on port ${this.port}`);
                logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`🔗 API: http://localhost:${this.port}${process.env.API_PREFIX || '/api/v1'}`);
                logger.info(`💻 Health Check: http://localhost:${this.port}/health`);
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${this.port} is already in use`);
                } else {
                    logger.error('Server error:', error);
                }
                process.exit(1);
            });

        } catch (error) {
            logger.error('Failed to start server:', error);
            throw error;
        }
    }

    async gracefulShutdown() {
        logger.info('Starting graceful shutdown...');

        // Close server
        this.server.close(async (error) => {
            if (error) {
                logger.error('Error during server shutdown:', error);
            }

            try {
                // Close database connections
                await database.disconnect();
                await redisClient.disconnect();

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (shutdownError) {
                logger.error('Error during shutdown:', shutdownError);
                process.exit(1);
            }
        });

        // Force shutdown after timeout
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }

    // Method to get app instance (useful for testing)
    getApp() {
        return this.app;
    }

    // Method to get server instance
    getServer() {
        return this.server;
    }

    // Method to get io instance
    getIO() {
        return this.io;
    }
}

// Create and initialize server
const serverInstance = new Server();

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    serverInstance.initialize().catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}

// Export for testing
module.exports = serverInstance;