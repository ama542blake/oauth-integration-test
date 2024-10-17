import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import {NextFunction, Request, RequestHandler, Response} from 'express';
import dotenv from 'dotenv';
import { ROUTE_INITIATE_OAUTH2, ROUTE_LOGIN } from './routers/route-constants';
import { StatusCodes } from 'http-status-codes';


dotenv.config();

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
    if (req.cookies && req.cookies['token']) {
        const token = req.cookies['token'];
        try {
            const jwtPayload: JwtPayload = verifyJwt(token);
            if (jwtPayload.userId && req.body) {
                req.body['userId'] = jwtPayload.userId;

                next();
                // return;
            } else {
                // res.status(StatusCodes.UNAUTHORIZED).send({message: "User ID could not be determined from JWT"});
                // return;
            }
        } catch (error: any) {
            if (error instanceof TokenExpiredError) {
                // TODO: token refresh logic
                // res.status(StatusCodes.UNAUTHORIZED).send({message: "JWT expired"});
            } else {
                // res.status(StatusCodes.UNAUTHORIZED).send({message: "Invalid JWT", err: JSON.stringify(error)});
            }
        }
    }

    next();
}

function verifyJwt(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"] }) as JwtPayload;
}

export function getAuthenticatedUser(req: Request): string | undefined {
    return req.body?.userId;
}