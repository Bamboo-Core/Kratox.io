
import 'dotenv/config';
import express, { type Application, type Request, type Response } from 'express';
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
import logRoutes from './routes/log-routes.js';
import { initializeFeatureFlagService } from './services/feature-flag-service.js';
import { chat } from './controllers/chat-controller.js';

const app: Application = express();

// --- CORS Configuration ---
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:9002');
  console.log('No ALLOWED_ORIGINS set, defaulting to http://localhost:9002 for development.');
}

allowedOrigins.push('https://studio.web.app');
console.log('Allowed CORS Origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    }
  },
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- API Documentation Route ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.get('/api/health', (req: Request, res: Response) => {
  const routes: any[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // routes that were registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === 'router') {
      // routes that were registered on routers
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route;
        if (route) {
          const path =
            (middleware.regexp.source.replace(/^\\\/|\\\/$/g, '').replace('\\/', '/') || '') +
            route.path;
          routes.push({
            path: path,
            methods: Object.keys(route.methods),
          });
        }
      });
    }
  });

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    registered_routes: routes,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/zabbix', zabbixRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/logs', logRoutes);

// --- Start Server ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
  initializeFeatureFlagService(process.env.SPLIT_SDK_KEY);

  console.log(`Backend server is running at http://localhost:${port}`);
  console.log(`API documentation available at http://localhost:${port}/api-docs`);
});
