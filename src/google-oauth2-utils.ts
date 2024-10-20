// following this example: https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest#oauth2

import { OAuth2Client } from 'google-auth-library';
import { StatusCodes } from 'http-status-codes';
import { Response } from 'express';
import url from 'url';
import open from 'open';
import dotenv from 'dotenv';
import http from 'http';
import destroyer from 'server-destroy';
import { getJwtForClient } from './jwt-utils';

dotenv.config();

/**
* Create a new OAuth2Client and go through the OAuth2 flow.
* Return the full client with credentials to the callback.
*/
export function getAuthenticatedClient(): Promise<OAuth2Client> {
    return new Promise((resolve, reject) => {
        // create an oAuth client to authorize the API call
        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            // access to user profile and email address - can find list of scopes below:
            // https://developers.google.com/identity/protocols/oauth2/scopes
            scope: 'openid',
        });
        
        // TODO: can we just set up a route for the Express server to listen for this?
        // open an http server to accept the oauth callback
        const server = http.createServer(async (req, res) => {
            try {
                // make sure the code is part of the request URL
                if (req?.url && req.url.indexOf('/?code') > -1) {
                    // acquire the code from the querystring, then close the web server
                    const queryString = new url.URL(req.url, process.env.GOOGLE_REDIRECT_URI).searchParams;
                    const code = queryString.get('code');
                    // TODO: this opens a new tab with this message. How can we not do that?
                    res.end('Authentication successful! Please return to the console.');
                    server.destroy();

                    // acquire access token from auth code - will also include refresh token
                    const tokenResponse = await oAuth2Client.getToken(code ?? '');
                    // make sure to set the credentials on the OAuth2 client.
                    oAuth2Client.setCredentials(tokenResponse.tokens);
                    resolve(oAuth2Client);
                } else {
                    reject('Could not find authentication token in URL redirect from Google');
                }
            } catch (e) {
                reject(e);
            }
        }).listen(process.env.GOOGLE_REDIRECT_PORT, () => {
            // open the browser to the authorize url to start the workflow
            open(authorizeUrl, {wait: true}).then(cp => {
                cp.unref();
            }).catch(e => {
                console.log(`Exception while opening authorization URL: ${e}`);
            })
        });

        destroyer(server);
    });
}


export function verifyIdTokenAndSendJwt(client: OAuth2Client, res: Response) {
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
                res.cookie('token', jwt, {
                    httpOnly: true,
                    maxAge: 60*60*24, // 1 day
                    secure: false, // TODO: set to true once operating on HTTPS
                    sameSite: "lax"
                }).sendStatus(StatusCodes.OK);
            } catch (e) {
                res.status(StatusCodes.UNAUTHORIZED);
            }
        }).catch(() => {
            res.status(StatusCodes.UNAUTHORIZED);
        });
    }
}