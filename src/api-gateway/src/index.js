const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');


const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key';

const SERVICES = {
  user:         process.env.USER_SERVICE_URL         || 'http://user-service:8001',
  project:      process.env.PROJECT_SERVICE_URL      || 'http://project-service:8002',
  task:         process.env.TASK_SERVICE_URL         || 'http://task-service:8003',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:8004',
};

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan('combined'));

// ── Auth middleware ───────────────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  { path: '/api/users/register', method: 'POST' },
  { path: '/api/users/login',    method: 'POST' },
  { path: '/health',             method: 'GET'  },
];

function authMiddleware(req, res, next) {
  const isPublic = PUBLIC_ROUTES.some(
    r => req.path.startsWith(r.path) && req.method === r.method
  );
  if (isPublic) return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id']    = String(decoded.userId);
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role']  = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.use(authMiddleware);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

// ── Proxy routes ──────────────────────────────────────────────────────────────
function proxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, _req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ error: 'Service unavailable' });
      },
    },
  });
}

app.use('/api/users',         proxy(SERVICES.user));
app.use('/api/projects',      proxy(SERVICES.project));
app.use('/api/tasks',         proxy(SERVICES.task));
app.use('/api/notifications', proxy(SERVICES.notification));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, '0.0.0.0', () => console.log(`API Gateway running on port ${PORT}`));

module.exports = app;
