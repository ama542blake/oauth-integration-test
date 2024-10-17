import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import getAuthenticatedClient from './oauth2';
import { OAuth2Client } from 'google-auth-library';
import { getAuthenticatedUser, getJwtForClient } from './jwt-utils';
import cookieParser from 'cookie-parser';
import { authenticate } from './jwt-utils';
import { ROUTE_HOME, ROUTE_INITIATE_OAUTH2, ROUTE_LOGIN } from './routers/route-constants';
import { StatusCodes } from 'http-status-codes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

configureMiddleware(app);
app.set('view engine', 'ejs');
configureRoutes(app);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

function configureMiddleware(app: Express) {
  // so that we can serve JS files for front end - will get 404 error otherwise
  // NOTE: for public/js/somefile.js, request path needs to be to /js/somefile.js rather than /public/js/somefile.js
  app.use(express.static('public'));

  // parses the body of the request (which popules req.body)
  app.use(express.json());

  // middleware to parse cookies in requests (places them in req.cookies)
  app.use(cookieParser());

  // use when debugging requests
  // app.use((req: Request, res: Response, next: NextFunction) => {
  //   console.log(`reqUrl = ${req.url}`);
  //   next();
  // });

  // validates JWTs
  app.use(authenticate);
}

function configureRoutes(app: Express) {
  // redirect to either home or login
  app.get("/", (req: Request, res: Response) => {
    if (getAuthenticatedUser(req)) {
      res.redirect(ROUTE_HOME);
    } else {
      res.redirect(ROUTE_LOGIN);
    }
  });

  // renders the login page (if user not authenticated)
  app.get(ROUTE_LOGIN, (req: Request, res: Response) => {
    if (getAuthenticatedUser(req)) {
      // user is already logged in, so take them home
      res.redirect(ROUTE_HOME);
    } else {
      res.render('login');
    }
  });

  // renders the home page (if user is authenticated)
  app.get(ROUTE_HOME, (req: Request, res: Response) => {
    if (getAuthenticatedUser(req)) {
      res.render('home');
    } else {
      res.redirect(ROUTE_LOGIN);
    }
  });

  // initiate the OAuth process
  app.post(ROUTE_INITIATE_OAUTH2, async (req: Request, res: Response) => {
    const client: OAuth2Client = await getAuthenticatedClient();

    if (client.credentials.id_token) {
      client.verifyIdToken({
        idToken: client.credentials.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      }).then((ticket) => {
        const userId: string = ticket.getUserId() ?? '';
        if (userId === '') {
          res.status(StatusCodes.UNAUTHORIZED);
        }

        // TODO: user ID will need to be stored in DB to identify users
        try {
          const jwt = getJwtForClient(userId);
          res.cookie('token', jwt).sendStatus(StatusCodes.OK);
        } catch (e) {
          res.status(StatusCodes.UNAUTHORIZED);
        }
      }).catch(() => {
        res.status(StatusCodes.UNAUTHORIZED);
      });
    }
  });
}