# taller-docker-nginx

## Aporte del Estudiante 2: Docker y Docker Compose

Esta parte del taller configura la infraestructura de contenedores y la comunicación entre los servicios de la aplicación.

### Dockerfiles

- `backend/Dockerfile`: construye la imagen de la API con Node.js sobre Alpine, instala las dependencias con pnpm, copia el código fuente, declara el puerto `3000` y ejecuta la aplicación.
- `nginx/Dockerfile`: parte de la imagen oficial de Nginx sobre Alpine, instala la configuración del proxy y declara el puerto `80`.

### Servicios de Docker Compose

El archivo `compose.yml` coordina tres servicios:

- `backend`: construye la API desde `backend/`, recibe `REDIS_URL=redis://redis:6379` y espera a que Redis esté saludable antes de iniciar.
- `nginx`: construye el proxy inverso desde `nginx/`, recibe las solicitudes del host en `localhost:8080` y las envía al backend mediante el nombre de servicio `backend`.
- `redis`: usa la imagen `redis:alpine`, comprueba su disponibilidad con `redis-cli ping` y conserva sus datos en el volumen `redis-data`.

### Red y comunicación entre contenedores

Docker Compose crea automáticamente la red predeterminada `taller-docker-nginx_default` y conecta allí los tres servicios. Dentro de esa red, los contenedores se encuentran mediante sus nombres de servicio: Nginx accede a `backend:3000` y la API accede a `redis:6379`. Por este motivo no es necesario publicar esos dos puertos en el equipo anfitrión.

### Diferencia entre `ports` y `expose`

- `expose: "3000"` declara el puerto interno del backend para la comunicación entre contenedores, sin publicarlo en el host.
- `ports: "8080:80"` publica Nginx: el puerto `8080` del host se redirige al puerto `80` del contenedor.
- Redis solo se utiliza dentro de la red de Compose, por lo que su puerto `6379` tampoco se publica.

Así, el único punto de entrada desde el navegador es `http://localhost:8080` y el backend queda protegido detrás del proxy inverso.

### Redis y persistencia

Redis está implementado como caché/contador de visitas. La API incrementa la clave `visits` en el endpoint `GET /visits`. El volumen nombrado `redis-data` se monta en `/data` para conservar los datos del contenedor entre reinicios.

### Ejecución y verificación

```bash
docker compose up --build -d
docker compose ps
docker compose logs
curl http://localhost:8080/
curl http://localhost:8080/visits
docker compose down
```
