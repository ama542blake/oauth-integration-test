// src/index.js
import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import getAuthenticatedClient from './oauth2';
import { OAuth2Client } from 'google-auth-library';
// import { Options, Sequelize } from 'sequelize';

dotenv.config();

// const options: Options = {
//   host: '906dev.database.windows.net',
//   database: '906ATDev',
//   username: 'blake@906AT.onmicrosoft.com',
//   password: ''
// };

// const sequelize = new Sequelize(options);

const app: Express = express();
const port = process.env.PORT;

// so that we can serve JS files for front end - will get 404 error otherwise
// NOTE: for public/js/somefile.js, request path needs to be to /js/somefile.js rather than /public/js/somefile.js
app.use(express.static('public'))

app.set('view engine', 'ejs');

app.get('/', (req: Request, res: Response) => {
  res.render('oauth2test');
});

// initiate the OAuth process
// in this example, we return the tokens to the front end, but in practice we need to store this info
app.put("/initiate", async (req: Request, res: Response) => {
  const client: OAuth2Client = await getAuthenticatedClient();

  if (client.credentials.id_token) {
    client.verifyIdToken({ 
      idToken: client.credentials.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    }).then((ticket) => {
      // TODO: user ID will need to be stored in DB to identify users
      console.log(`JWT ID token verification successful - ${ticket.getUserId()}`)
      res.sendStatus(200);
    }).catch(() => {
      res.status(401).send({message: "ID token verification failed"});
    });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});