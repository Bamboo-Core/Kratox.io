
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

const app: Application = express();

// --- CORS Configuration ---
const baseOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean); // filter(Boolean) removes empty strings
const studioUrl = process.env.IDE_PREVIEW_URL;

const allowedOrigins = [...baseOrigins];
if (studioUrl) {
  // The studio URL might have a trailing slash, so we remove it
  allowedOrigins.push(studioUrl.replace(/\/$/, ''));
}

console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server health checks)
    if (!origin) {
      return callback(null, true);
    }
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
};


// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Documentation Route ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
  console.log(`Backend server is running at http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
});
