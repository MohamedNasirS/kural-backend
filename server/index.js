import cors from "cors";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";

// Import configuration
import {
  PORT,
  isProduction,
  CLIENT_ORIGINS,
  MONGODB_URI,
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_SAMESITE,
  SESSION_SECRET,
} from "./config/index.js";

// Import route registrar
import { registerRoutes } from "./routes/index.js";

const app = express();
app.set("trust proxy", 1);

// Security middleware - adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now as it may break frontend
  crossOriginEmbedderPolicy: false,
}));

// Helper function to check if origin is localhost
function isLocalhostOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
  } catch {
    return false;
  }
}

// CORS middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        CLIENT_ORIGINS.includes("*") ||
        CLIENT_ORIGINS.includes(origin) ||
        (!isProduction && isLocalhostOrigin(origin));

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS origin ${origin} not allowed. Update CLIENT_ORIGIN env variable.`,
        ),
      );
    },
    credentials: true,
  }),
);

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize MongoDB session store
const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  collectionName: 'sessions',
  ttl: 24 * 60 * 60, // 24 hours in seconds
  autoRemove: 'native',
  touchAfter: 24 * 3600, // lazy session update
});

// Session middleware
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: 'kural.sid',
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: SESSION_COOKIE_SAMESITE,
      path: '/',
      domain: SESSION_COOKIE_DOMAIN || undefined,
    },
  })
);

// Middleware to restore user from session
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    if (process.env.NODE_ENV === 'development') {
      console.log('Session restored - User:', {
        id: req.user.id || req.user._id,
        role: req.user.role,
        sessionId: req.sessionID
      });
    }
  }
  next();
});

// Register all routes
registerRoutes(app);

// Start server
app.listen(PORT, () => {
  console.log(`Auth server listening on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});
