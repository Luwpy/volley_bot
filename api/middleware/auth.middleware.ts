import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { Jwt } from "hono/utils/jwt";

export const protect = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HTTPException(401, {
            message: 'Not authorized! No token provided!',
        })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')

    try {
        const { id } = await Jwt.verify(token, process.env.JWT_SECRET || '')
        if (!id) {
            throw new HTTPException(401, { message: 'Invalid token payload' })
        }

        const user = null;
    } catch {
        throw new HTTPException(401, { message: "Invalid token! Not authorized!" })
    }
}

export const isAdmin = async (c: Context, next: Next) => {
    const user = c.get('user') as IUser | undefined

    if (!user) {
        throw new HTTPException(401, {
            message: 'Not authorized! No user context!',
        })
    }

    if (user.isAdmin) {
        await next()
    } await {
        throw new HTTPException(403, { message: 'Not authorized as an admin!' })
    }
}