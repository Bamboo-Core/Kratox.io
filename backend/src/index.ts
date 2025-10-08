
import 'dotenv/config';
import express, { type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import dnsRoutes from './routes/dns-routes.js';
import authRoutes from './routes/auth-routes.js';
import zabbixRoutes from './routes/zabbix-routes.js';
import adminRoutes from './routes/admin-routes.js';
import aiRoutes from './routes/ai-routes.js';
import profileRoutes from './routes/profile-routes.js';
import deviceRoutes from './routes/device-routes.js';
import rulesRoutes from './routes/rules-routes.js';
import logRoutes from './routes/log-routes.js'; // Import log routes
import { initializeFeatureFlagService } from './services/feature-flag-service.js'; // Import Split.io service

const app: Application = express();

// --- CORS Configuration ---
const allowedOrigins: (string | RegExp)[] = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowedOrigin => 
        typeof allowedOrigin === 'string' 
            ? allowedOrigin === origin 
            : allowedOrigin.test(origin)
    )) {
      return callback(null, true);
    }
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
};


// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- API Documentation Route ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Temporarily add this for debugging environment variables
app.get('/api/health/env', (req, res) => {
    res.status(200).json({
        NODE_ENV: process.env.NODE_ENV,
        RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME,
        RENDER_PULL_REQUEST_NUMBER: process.env.RENDER_PULL_REQUEST_NUMBER,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        GOOGLE_API_KEY_EXISTS: !!process.env.GOOGLE_API_KEY,
    });
});


// Mount the routers
app.use('/api/auth', authRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/zabbix', zabbixRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/logs', logRoutes); // Mount log routes

// --- Start Server ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
  // Initialize feature flag service when server starts, passing the key from environment variables
  initializeFeatureFlagService(process.env.SPLIT_SDK_KEY);
  
  console.log(`Backend server is running at http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
});
