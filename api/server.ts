import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono({ strict: false }).basePath("/api/v1");

//Logger
app.use(logger());

//Compress Middleware
app.use(
    compress({
        encoding: "gzip",
        threshold: 1024, //Minimum size to compress(1KB)
    }),
);

//CORS
app.use(
    '*',
    cors({
        origin: '*', //Allowed origins
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
        maxAge: 86400,
    })
)

app.get('/', (c) => {
    const apiRoutes = [
        {
            method: 'GET',
            path: '/api/v1',
            description: 'API Documentation',
            auth: false,
            admin: false,
        },
        {
            method: 'POST',
            path: '/api/v1/users',
            description: 'Create a new user',
            auth: false,
            admin: false,
        },
        {
            method: 'POST',
            path: '/api/v1/users/login',
            description: 'User login',
            auth: false,
            admin: false,
        },
        {
            method: 'GET',
            path: '/api/v1/users/profile',
            description: 'Get user profile',
            auth: true,
            admin: false,
        },
        {
            method: 'PUT',
            path: '/api/v1/users/profile',
            description: 'Update user profile',
            auth: true,
            admin: false,
        },
        {
            method: 'GET',
            path: '/api/v1/users',
            description: 'Get all users',
            auth: true,
            admin: true,
        },
        {
            method: 'GET',
            path: '/api/v1/users/:id',
            description: 'Get user by ID',
            auth: true,
            admin: true,
        },
    ]

    return c.html(
        ApiDoc({
            title: "Volley API",
            version: '0.0.1',
            routes: apiRoutes
        })
    )
})