import passport from 'passport';
// @ts-ignore
import { Strategy as GitHubStrategy } from 'passport-github2';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { Express, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { log } from './vite';
import { pool } from './db';

const PgSession = ConnectPgSimple(session);

// Set up session store
const sessionStore = new PgSession({
  pool,
  tableName: 'sessions',
  createTableIfMissing: true
});

export const setupAuth = (app: Express): void => {
  // Configure express-session
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
      },
    })
  );

  // Initialize Passport and restore authentication state, if any, from the session
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Set up GitHub authentication strategy
  // For GitHub OAuth, we need a static callback URL
  const callbackURL = process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com/api/auth/github/callback'
    : 'https://54b5bc4a-1e97-4368-b6d9-25142d7f6322-00-35z4z3ollquhc.janeway.replit.dev/api/auth/github/callback';

  // Only set up GitHub strategy if credentials are provided
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL,
        },
        // @ts-ignore - Ignoring type issues with GitHub strategy
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            // Check if user exists
            const [existingUser] = await db
              .select()
              .from(users)
              .where(eq(users.githubId, profile.id));

            if (existingUser) {
              // Update access token
              await db
                .update(users)
                .set({
                  githubAccessToken: accessToken,
                })
                .where(eq(users.id, existingUser.id));

              return done(null, existingUser);
            }

            // Create new user
            const [newUser] = await db
              .insert(users)
              .values({
                username: profile.username || `github_${profile.id}`,
                password: '', // No password for OAuth users
                githubId: profile.id,
                githubUsername: profile.username,
                githubAccessToken: accessToken,
              })
              .returning();

            return done(null, newUser);
          } catch (error) {
            log(`Error in GitHub auth strategy: ${error}`, 'auth');
            return done(error as Error, undefined);
          }
        }
      )
    );
  } else {
    log('GitHub authentication disabled - missing client ID or client secret', 'auth');
  }

  // Auth routes
  app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

  app.get(
    '/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req: Request, res: Response) => {
      res.redirect('/');
    }
  );

  app.get('/api/auth/logout', (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  app.get('/api/auth/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          githubUsername: user.githubUsername,
        },
      });
    }
    return res.json({ isAuthenticated: false });
  });
};

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};