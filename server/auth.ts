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
        secure: true, // Always use secure cookies
        httpOnly: true,
        sameSite: 'lax', // Better cross-site protection
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
  // For GitHub OAuth, we need the correct callback URL for the domain
  const callbackURL = process.env.NODE_ENV === 'production'
    ? 'https://codexplainer.joshuakessell.com/api/auth/github/callback'
    : `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/auth/github/callback`;
  
  // Log the callback URL being used to aid in debugging
  log(`GitHub OAuth callback URL: ${callbackURL}`, 'auth');

  // Only set up GitHub strategy if credentials are provided
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL,
          // Add these options to improve production compatibility
          scope: ['user:email'],
          proxy: true // Enable for running behind proxies like Cloudflare
        },
        // @ts-ignore - Ignoring type issues with GitHub strategy
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            // Log for debugging
            log(`GitHub auth: Processing profile ${profile.id} (${profile.username})`, 'auth:github');
            
            // Check if user exists
            const [existingUser] = await db
              .select()
              .from(users)
              .where(eq(users.githubId, profile.id));

            if (existingUser) {
              log(`GitHub auth: Found existing user ${existingUser.username}`, 'auth:github');
              
              // Update access token
              await db
                .update(users)
                .set({
                  githubAccessToken: accessToken,
                  // Update other fields that might have changed
                  username: profile.username || existingUser.username,
                  githubUsername: profile.username,
                })
                .where(eq(users.id, existingUser.id));

              const updatedUser = {...existingUser, githubAccessToken: accessToken};
              return done(null, updatedUser);
            }

            log(`GitHub auth: Creating new user for ${profile.username}`, 'auth:github');
            
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

            log(`GitHub auth: Successfully created new user with ID ${newUser.id}`, 'auth:github');
            return done(null, newUser);
          } catch (error) {
            log(`Error in GitHub auth strategy: ${error}`, 'auth:github:error');
            return done(error as Error, undefined);
          }
        }
      )
    );
  } else {
    log('GitHub authentication disabled - missing client ID or client secret', 'auth');
  }

  // Auth routes
  app.get('/api/auth/github', (req, res, next) => {
    log(`GitHub auth route accessed from ${req.headers.host}`, 'auth:github');
    
    // Debug the request information
    try {
      log(`GitHub auth debug info - Headers: ${JSON.stringify(req.headers)}`, 'auth:github:debug');
    } catch (error) {
      log(`Could not stringify headers: ${error}`, 'auth:github:debug');
    }
    
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
  });

  app.get(
    '/api/auth/github/callback',
    (req: Request, res: Response, next: NextFunction) => {
      log(`GitHub callback received, authenticating user...`, 'auth:github:callback');
      
      passport.authenticate('github', { failureRedirect: '/' }, (err, user, info) => {
        if (err) {
          log(`GitHub authentication error: ${err}`, 'auth:github:error');
          return res.redirect('/?auth_error=github_error');
        }
        
        if (!user) {
          log(`GitHub authentication failed: ${JSON.stringify(info)}`, 'auth:github:error');
          return res.redirect('/?auth_error=no_user');
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            log(`GitHub login error: ${loginErr}`, 'auth:github:error');
            return res.redirect('/?auth_error=login_error');
          }
          
          log(`GitHub authentication successful for user: ${JSON.stringify(user)}`, 'auth:github:success');
          return res.redirect('/');
        });
      })(req, res, next);
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