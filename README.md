# Taller Docker + Nginx

Una API REST hecha con Node.js y Express que corre dentro de Docker y solo se puede usar a través de Nginx, que funciona como reverse proxy. Además tiene un servicio Redis al que la API se conecta usando el nombre del servicio.

## Descripción de la solución

- **API (`api`)**: Node.js + Express + TypeScript. El puerto sale de la variable de entorno `PORT`. Endpoints:
  - `GET /` responde `Hello World!`
  - `GET /health` responde `{"status":"ok","service":"backend-api"}`
  - `GET /api/products` lista de productos
  - `GET /api/products/:id` producto específico (404 si no existe)
  - `GET /visits` contador de visitas guardado en Redis
- **Nginx (`nginx`)**: único punto de entrada. Escucha en el puerto 80 del contenedor, publicado como `8080` en el host, y reenvía las peticiones a `http://api:3000`.
- **Redis (`redis`)**: usa la imagen `redis:alpine`, tiene healthcheck con `redis-cli ping` y guarda sus datos en el volumen `redis-data`.

## Arquitectura

```
HOST
  |
  | :8080
  v
+-----------+
|   nginx   |
|   :80     |
+-----+-----+
      |
 Docker Network (taller-docker-nginx_default)
      |
      v
+-----------+       +-----------+
|    api    | ----> |   redis   |
|   :3000   |       |   :6379   |
+-----------+       +-----------+
```

Solo `nginx` publica un puerto al host (`8080`). `api` y `redis` solo se ven dentro de la red de Docker.

## Estructura del proyecto

```
.
├── backend/
│   ├── src/server.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf
│   └── Dockerfile
├── compose.yml
└── README.md
```

## Cómo ejecutar el proyecto

Necesitas tener Docker y Docker Compose instalados.

```
docker compose up --build -d
docker compose ps
```

Hay que esperar unos segundos a que la API termine de arrancar. Después se prueba con:

```
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/api/products
```

Para apagar todo:

```
docker compose down
```

En PowerShell hay que usar `curl.exe` en vez de `curl`, porque `curl` es un alias de `Invoke-WebRequest`.

## Comandos Docker utilizados

| Comando | Para qué |
|---|---|
| `docker compose up --build -d` | Construir las imágenes y levantar los servicios en segundo plano |
| `docker compose ps` | Ver el estado de los contenedores y los puertos publicados |
| `docker compose logs nginx` / `docker compose logs api` | Ver los logs de cada servicio |
| `docker compose down` | Apagar y eliminar los contenedores y la red |
| `docker network ls` | Listar las redes de Docker |
| `docker network inspect taller-docker-nginx_default` | Ver qué contenedores están en la red y sus IPs |

## Diferencia entre `ports` y `expose`

- `ports: "8080:80"` (servicio `nginx`) **publica** el puerto 80 del contenedor en el puerto 8080 del host. Por eso se puede entrar desde el navegador a `http://localhost:8080`.
- `expose: "3000"` (servicio `api`) solo declara el puerto interno para la comunicación entre contenedores. **No lo publica en el host**, así que `localhost:3000` ya no responde. En la práctica, lo que evita el acceso directo desde el host es quitar el `ports` de la API.

Relacionado con eso, en la Parte 3 del taller: el *puerto del contenedor* es el puerto donde escucha el proceso dentro del contenedor (la API escucha en `3000`), y el *puerto publicado* es el del host al que se mapea (en `8080:80`, el `8080` es el del host y el `80` el del contenedor).

## `localhost` vs nombre del servicio Docker

Cada contenedor tiene su propia red interna. Por eso `localhost` dentro del contenedor de Nginx es el propio contenedor de Nginx y no la API. En cambio, Docker Compose crea una red y un DNS interno donde cada servicio se puede encontrar por su nombre: `http://api:3000` se resuelve a la IP del contenedor `backend-api`. Con el mismo principio, la API se conecta a Redis con `redis://redis:6379`.

## Evidencias de las pruebas

### Contenedores levantados

```
NAME          IMAGE                       COMMAND                  SERVICE   STATUS                    PORTS
backend-api   taller-docker-nginx-api     "docker-entrypoint.s…"   api       Up 49 seconds             3000/tcp
nginx-proxy   taller-docker-nginx-nginx   "/docker-entrypoint.…"   nginx     Up 49 seconds             0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
redis-cache   redis:alpine                "docker-entrypoint.s…"   redis     Up 55 seconds (healthy)   6379/tcp
```

Solo `nginx` tiene un puerto publicado en el host (`8080`). `api` y `redis` únicamente son visibles dentro de la red de Docker.

### Pruebas a través de Nginx (puerto 8080)

```
> curl.exe http://localhost:8080/
Hello World!

> curl.exe http://localhost:8080/health
{"status":"ok","service":"backend-api"}

> curl.exe http://localhost:8080/api/products
[{"id":1,"name":"Teclado mecánico","price":220000},{"id":2,"name":"Mouse inalámbrico","price":85000},{"id":3,"name":"Monitor 24\"","price":650000},{"id":4,"name":"Audífonos con cancelación de ruido","price":310000}]

> curl.exe http://localhost:8080/api/products/1
{"id":1,"name":"Teclado mecánico","price":220000}

> curl.exe http://localhost:8080/api/products/99
{"error":"Producto no encontrado"}

> curl.exe http://localhost:8080/visits
{"visits":1}
```

### Logs de Nginx (las peticiones pasaron por el proxy)

```
"GET / HTTP/1.1" 200 12
"GET /health HTTP/1.1" 200 39
"GET /api/products HTTP/1.1" 200 219
"GET /api/products/1 HTTP/1.1" 200 50
"GET /api/products/99 HTTP/1.1" 404 34
"GET /visits HTTP/1.1" 200 12
```

### Acceso directo a la API eliminado (Parte 7)

Después de cambiar `ports` por `expose` en el servicio `api`:

```
NAME          IMAGE                       SERVICE   STATUS                   PORTS
backend-api   taller-docker-nginx-api     api       Up 1 second              3000/tcp
nginx-proxy   taller-docker-nginx-nginx   nginx     Up Less than a second    0.0.0.0:8080->80/tcp
redis-cache   redis:alpine                redis     Up 6 seconds (healthy)   6379/tcp

> curl.exe http://localhost:8080/health
{"status":"ok","service":"backend-api"}

> curl.exe http://localhost:3000/health
curl: (7) Failed to connect to localhost:3000 after 2246 ms: Could not connect to server
```

La API solo se puede usar por `localhost:8080`.

### Nota sobre un 502 al arrancar

Justo después de `docker compose up`, si se hace un `curl` de inmediato, Nginx puede responder `502 Bad Gateway`. Los logs mostraron `connect() failed (111: Connection refused)` porque la API todavía estaba arrancando. Esto pasa porque `depends_on` solo espera a que el contenedor de la API se inicie, no a que la aplicación ya esté escuchando. Unos segundos después la misma petición dio `200`. Además, `depends_on: - api` en el servicio `nginx` es necesario: sin él, Nginx puede arrancar antes que la API y caerse por no poder resolver el nombre `api`.

## Troubleshooting: usar `localhost` en vez de `api` (Parte 9)

Se cambió temporalmente `nginx.conf` para usar `http://localhost:3000` en lugar de `http://api:3000`, y se reconstruyó con `docker compose down` y `docker compose up --build -d`.

```
> curl.exe http://localhost:8080/health
<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.31.6</center>
</body>
</html>
```

Logs de Nginx:

```
[error] connect() failed (111: Connection refused) while connecting to upstream, request: "GET /health HTTP/1.1", upstream: "http://[::1]:3000/health"
[error] connect() failed (111: Connection refused) while connecting to upstream, request: "GET /health HTTP/1.1", upstream: "http://127.0.0.1:3000/health"
"GET /health HTTP/1.1" 502 157
```

Redes (`docker network ls`) y contenedores en la red (`docker network inspect taller-docker-nginx_default`):

```
NETWORK ID     NAME                          DRIVER
1ffc183a2a32   taller-docker-nginx_default   bridge

backend-api   172.18.0.3/16
redis-cache   172.18.0.2/16
nginx-proxy   172.18.0.4/16
```

**Respuestas a las preguntas del taller:**

1. **¿Qué error se obtiene?** `502 Bad Gateway`.
2. **¿Por qué ocurre?** Nginx intenta conectarse a `localhost:3000` (`[::1]` y `127.0.0.1` en los logs) y ahí no hay ningún proceso escuchando, así que la conexión es rechazada (`Connection refused`).
3. **¿Por qué `localhost` no representa al contenedor `api`?** Porque cada contenedor tiene su propia red. `localhost` dentro del contenedor de Nginx apunta al propio Nginx, y la API está en otro contenedor con otra IP (`172.18.0.3`).
4. **¿Cómo se soluciona?** Usando el nombre del servicio en `nginx.conf` (`http://api:3000`), que el DNS interno de Docker Compose resuelve a la IP del contenedor de la API. Después se reconstruye con `docker compose up --build -d`.
5. **¿Qué comando verifica las redes Docker?** `docker network ls` para listarlas y `docker network inspect <nombre>` para ver los contenedores conectados y sus IPs.

Después de la prueba se devolvió `nginx.conf` a `http://api:3000` y todo volvió a funcionar.

## Reto adicional: Redis

Se agregó el servicio `redis` y la API lo referencia por su nombre (`REDIS_URL=redis://redis:6379`), no por `localhost`. El endpoint `GET /visits` incrementa la clave `visits` en Redis y devuelve el contador, lo que demuestra la comunicación entre servicios por DNS de Docker Compose. El volumen `redis-data` conserva los datos entre reinicios.

## Distribución del trabajo

- **Estudiante 1 (Backend/API)**: API REST y endpoints.
- **Estudiante 2 (Docker/Compose)**: Dockerfile, Compose, Redis.
- **Estudiante 3 (Nginx/Pruebas)**: configuración del reverse proxy, acceso directo eliminado, pruebas, troubleshooting y README.