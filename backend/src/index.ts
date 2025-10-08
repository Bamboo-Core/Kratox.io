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
// Lê as origens fixas (produção) da variável de ambiente
const baseOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// O Render preenche automaticamente IDE_PREVIEW_URL nos ambientes de Preview
const previewUrl = process.env.IDE_PREVIEW_URL;

// Combina as origens de produção com a URL de preview, se ela existir
const allowedOrigins = [...baseOrigins];
if (previewUrl) {
  // Remove a barra final, se houver, para consistência
  allowedOrigins.push(previewUrl.replace(/\/$/, ''));
}

console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origem (ex: Postman, apps móveis, health checks)
    if (!origin) {
      return callback(null, true);
    }
    // Verifica se a origem da requisição está na nossa lista de permitidas
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
  // Initialize feature flag service when server starts, passing the key from environment variables
  initializeFeatureFlagService(process.env.SPLIT_SDK_KEY);
  
  console.log(`Backend server is running at http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
});
