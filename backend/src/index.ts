
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
// Lê a variável de ambiente, separa por vírgula e remove espaços em branco de cada URL.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean); // Remove quaisquer entradas vazias caso a string seja "" ou tenha vírgulas extras.

console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  // Passa a lista de origens permitidas para a biblioteca cors.
  // A biblioteca cuidará da validação. Se a lista estiver vazia, nenhuma origem será permitida.
  origin: allowedOrigins,
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
