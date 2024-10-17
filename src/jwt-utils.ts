import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { SIGNING_METHOD } from './constants';

dotenv.config();
 
/**
 * Generates and signs a JWT with a Google user ID as the payload.
 * @param userId A Google user ID
 * @returns A signed JWT whose payload is the supplied user ID
 */
export function getJwtForClient(userId: string): string {
    return jwt.sign({userId: userId}, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

/**
 * Middleware for authentication. Checks that JWT sent as cookie is present and valid.
 * 
 * IMPORTANT: During middleware setup, this must be called 
 *  -app.use(express.json()), as it defines req.body AND
 *  -app.use(cookieParser()), as it relies on the cookieParser middleware
 * @param req 
 * @param res 
 * @param next 
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
    // TODO: in error/invalid scenarios, should we be calling next(any argument), which indicates an issue during middleware execution

    if (req.cookies && req.cookies['token']) {
        const token = req.cookies['token'];
        try {
            const jwtPayload: JwtPayload = verifyJwt(token);
            if (jwtPayload.userId && req.body) {
                req.body['userId'] = jwtPayload.userId;
            }
        } catch (error: any) {
            if (error instanceof TokenExpiredError) {
                // TODO: token refresh logic
            }
        }
    }

    next();
}

/**
 * Verifies that the JWT is valid, meaning it was signed by this server.
 * @param token The URL encoded JWT
 * @returns The decoded payload of the JWT, which will not contain the userId if JWT is invalid
 */
function verifyJwt(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: [SIGNING_METHOD] }) as JwtPayload;
}

/**
 * Pulls the Google user ID out of the request body.
 * @param req The request, whose body is expected to contain the user ID
 * @returns The Google user ID if the user has been authenticated, undefined otherwise
 */
export function getAuthenticatedUserGoogleId(req: Request): string | undefined {
    return req.body?.userId;
}