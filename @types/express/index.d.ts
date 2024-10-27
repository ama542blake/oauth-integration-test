import session from 'express-session';

// add fields to the req.session objects
declare module 'express-session' {
    interface SessionData {
        userId?: string;
    }
}