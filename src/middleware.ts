import { NextFunction, RequestHandler, Request, Response } from "express";
import { ROUTE_INITIATE_OAUTH2, ROUTE_LOGIN } from "./constants";

/**
 * This must come after session({...}) in the middleware pipeline, as the session middleware defines
 * the req.session object.
 * @param req Incoming request
 * @param res Outoging response
 * @param next Next middleware function
 */
export const isAuthenticated: RequestHandler = function (req: Request, res: Response, next: NextFunction) {
    if (req.session?.userId) {
        next();
    } else {
        if (req.url === ROUTE_LOGIN || req.url === ROUTE_INITIATE_OAUTH2) {
            next('route');
        } else {
            res.redirect(ROUTE_LOGIN);
        }
    }
}