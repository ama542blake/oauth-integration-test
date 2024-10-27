import express, {Express, NextFunction, Request, Response} from 'express';
import dotenv from 'dotenv';
import { getAuthenticatedClient, verifyIdToken } from './google-oauth2-utils';
import { OAuth2Client } from 'google-auth-library';
import { ROUTE_HOME, ROUTE_INITIATE_OAUTH2, ROUTE_LOGIN, ROUTE_LOGOUT, SESSION_COOKIE_NAME } from './constants';
import session, { MemoryStore } from 'express-session';
import { StatusCodes } from 'http-status-codes';
import { isAuthenticated } from './middleware';

dotenv.config();
const protocol = process.env.PROTOCOL;
const hostname = process.env.HOSTNAME;
const port = process.env.PORT;

// TODO: replace with Redis store
const store: MemoryStore = new MemoryStore();

const app: Express = express();
configureMiddleware(app);
app.set('view engine', 'ejs');

app.listen(port, () => {
  console.log(`[server]: Server is running at ${protocol}://${hostname}:${port}`);
});

configureRoutes(app, store);

function configureMiddleware(app: Express) {
  // so that we can serve JS files for front end - will get 404 error otherwise
  // NOTE: for public/js/somefile.js, request path needs to be to /js/somefile.js rather than /public/js/somefile.js
  app.use(express.static('public'));

  // parses the body of the request (which populates req.body)
  app.use(express.json());
  
  // session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    cookie: { maxAge: 60*30*1000, httpOnly: true }, // cookie lasts 30 mins
    saveUninitialized: false,
    name: SESSION_COOKIE_NAME,
    store: store // TODO: this will need to be replaced
  }));
  
  // make sure user is authenticated
  app.use(isAuthenticated);
}

function configureRoutes(app: Express, store: MemoryStore) {
  // redirect to either home or login
  app.get("/", (req: Request, res: Response) => {
    if (req.session.userId) {
      res.redirect(ROUTE_HOME);
    } else {
      res.redirect(ROUTE_LOGIN);
    }
  });

  // renders the login page (if user not authenticated)
  app.get(ROUTE_LOGIN, (req: Request, res: Response) => {
    if (req.session?.userId) {
      // user is already logged in, so take them home
      res.redirect(ROUTE_HOME);
    } else {
      res.render('login');
    }
  });

  // renders the home page (if user is authenticated)
  app.get(ROUTE_HOME, (req: Request, res: Response) => {
    res.render('home');
  });

  // initiate the OAuth process
  app.post(ROUTE_INITIATE_OAUTH2, async (req: Request, res: Response) => {
    const client: OAuth2Client = await getAuthenticatedClient();
    const userId: string | null = await verifyIdToken(client);
    if (userId) {
      req.session.userId = userId;
      res.sendStatus(StatusCodes.OK);
    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  });

  // log user out
  app.post(ROUTE_LOGOUT, async (req: Request, res: Response) => {
    if (req.session?.id && req.session?.userId) {
      store.destroy(req.sessionID, (err => {
        if (err) {
          res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
        } else {
          res.clearCookie(SESSION_COOKIE_NAME).sendStatus(StatusCodes.OK);
        }
      }));

    } else {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  });
}