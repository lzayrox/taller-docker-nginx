import express, {
    type Express,
    type Request,
    type Response,
} from 'express';
import { createClient } from 'redis';

const app: Express = express();
const port = Number(process.env.PORT) || 3000;

const redis = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
});

redis.on('error', (error) => {
    console.error('Redis error:', error);
});

await redis.connect();

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.get('/visits', async (_req: Request, res: Response) => {
    const visits = await redis.incr('visits');

    res.json({ visits });
});

app.listen(port, () => {
    console.log(`API running on port ${port}`);
});