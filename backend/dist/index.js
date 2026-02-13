"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_js_1 = __importDefault(require("./config/swagger.js"));
const dns_routes_js_1 = __importDefault(require("./routes/dns-routes.js"));
const auth_routes_js_1 = __importDefault(require("./routes/auth-routes.js"));
const dns_controller_js_1 = require("./controllers/dns-controller.js");
const zabbix_routes_js_1 = __importDefault(require("./routes/zabbix-routes.js"));
const admin_routes_js_1 = __importDefault(require("./routes/admin-routes.js"));
const ai_routes_js_1 = __importDefault(require("./routes/ai-routes.js"));
const profile_routes_js_1 = __importDefault(require("./routes/profile-routes.js"));
const device_routes_js_1 = __importDefault(require("./routes/device-routes.js"));
const rules_routes_js_1 = __importDefault(require("./routes/rules-routes.js"));
const log_routes_js_1 = __importDefault(require("./routes/log-routes.js"));
const ip_routes_js_1 = __importDefault(require("./routes/ip-routes.js"));
const register_user_routes_js_1 = __importDefault(require("./routes/register-user-routes.js"));
const password_recovery_routes_js_1 = __importDefault(require("./routes/password-recovery-routes.js"));
const feature_flag_service_js_1 = require("./services/feature-flag-service.js");
const app = (0, express_1.default)();
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
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        }
        else {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            callback(new Error(msg), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200,
};
// --- Middleware ---
app.use((0, cors_1.default)(corsOptions));
app.use((0, cookie_parser_1.default)()); // Parse cookies from requests
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// --- API Documentation Route ---
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_js_1.default));
// --- Public Routes ---
app.get('/download/:token', dns_controller_js_1.downloadBlocklistByToken);
// --- API Routes ---
app.get('/api/health', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // routes that were registered directly on the app
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods),
            });
        }
        else if (middleware.name === 'router') {
            // routes that were registered on routers
            middleware.handle.stack.forEach((handler) => {
                const route = handler.route;
                if (route) {
                    const path = (middleware.regexp.source.replace(/^\\\/|\\\/$/g, '').replace('\\/', '/') || '') +
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
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/dns', dns_routes_js_1.default);
app.use('/api/zabbix', zabbix_routes_js_1.default);
app.use('/api/admin', admin_routes_js_1.default);
app.use('/api/ai', ai_routes_js_1.default);
app.use('/api/profile', profile_routes_js_1.default);
app.use('/api/devices', device_routes_js_1.default);
app.use('/api/rules', rules_routes_js_1.default);
app.use('/api/logs', log_routes_js_1.default);
app.use('/api/ip', ip_routes_js_1.default);
app.use('/api/register', register_user_routes_js_1.default);
app.use('/api/password-recovery', password_recovery_routes_js_1.default);
// --- Start Server ---
const port = process.env.PORT || 4001;
app.listen(port, () => {
    (0, feature_flag_service_js_1.initializeFeatureFlagService)(process.env.SPLIT_SDK_KEY);
    console.log(`Backend server is running at http://localhost:${port}`);
    console.log(`API documentation available at http://localhost:${port}/api-docs`);
});
