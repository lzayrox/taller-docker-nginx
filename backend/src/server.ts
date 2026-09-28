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

type Product = {
    id: number;
    name: string;
    price: number;
};

const products: Product[] = [
    { id: 1, name: 'Teclado mecánico', price: 220000 },
    { id: 2, name: 'Mouse inalámbrico', price: 85000 },
    { id: 3, name: 'Monitor 24"', price: 650000 },
    { id: 4, name: 'Audífonos con cancelación de ruido', price: 310000 },
];

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'backend-api',
    });
});

app.get('/api/products', (_req: Request, res: Response) => {
    res.json(products);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const product = products.find((p) => p.id === id);

    if (!product) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
    }

    res.json(product);
});

app.get('/visits', async (_req: Request, res: Response) => {
    const visits = await redis.incr('visits');

    res.json({ visits });
});

app.listen(port, () => {
    console.log(`API running on port ${port}`);
});