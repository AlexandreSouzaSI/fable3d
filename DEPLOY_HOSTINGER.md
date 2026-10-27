# Deploy do Fable no VPS Hostinger (mesmo VPS do Controle Rota)

| | Endereço | Porta interna (só 127.0.0.1) |
|---|---|---|
| Frontend | https://fable.amsx.online | 3021 |
| API | https://api.fable.amsx.online | 4002 |
| Postgres | — (só dentro do VPS) | 5450 |

As portas não batem com as do Rota (5433 / 4001 / 3011) e ficam presas em
`127.0.0.1`: de fora, só o Nginx enxerga os containers.

---

## 1. DNS (painel da Hostinger)

Em **Domínios → amsx.online → DNS / Nameservers**, crie dois registros
**A** apontando para o **IP do VPS** (o mesmo do `controlerota`):

| Tipo | Nome | Aponta para | TTL |
|---|---|---|---|
| A | `fable` | IP do VPS | 3600 |
| A | `api.fable` | IP do VPS | 3600 |

Teste (pode levar alguns minutos): `ping fable.amsx.online` deve responder
com o IP do VPS.

## 2. Enviar o código para o GitHub (no seu PC)

```bash
cd "/e/Projetos Nugalho/PROJETO FABLE"
git add -A
git commit -m "Ajustes para deploy na Hostinger"
git push
```

## 3. Clonar no VPS

```bash
ssh root@IP_DO_VPS
mkdir -p /opt && cd /opt
git clone https://github.com/AlexandreSouzaSI/fable3d.git fable
cd fable
```

Confira se as portas estão livres (não deve aparecer nada):

```bash
ss -ltnp | grep -E ':(3021|4002|5450) '
```

## 4. Arquivo `.env` de produção

```bash
cp .env.example .env
nano .env
```

```env
POSTGRES_PASSWORD=<senha forte>          # openssl rand -hex 24
JWT_SECRET=<segredo forte>               # openssl rand -base64 48
ADMIN_EMAIL=alemourasouza33@gmail.com
ADMIN_SENHA=<senha do primeiro login>
VITE_API_URL=https://api.fable.amsx.online
DB_PORT=5450
```

- Gere `POSTGRES_PASSWORD` e `JWT_SECRET` no próprio VPS com os comandos
  indicados. **Não reaproveite os do seu PC.**
- `POSTGRES_PASSWORD` só vale na **primeira** subida (é quando o volume do
  banco é criado). Para trocar depois, precisa trocar dentro do Postgres.
- `VITE_API_URL` fica embutido no front no momento do build: precisa ser a
  URL final, com `https`.

## 5. Subir os containers

```bash
docker compose up -d --build
docker compose ps                     # os 3 devem ficar "Up"
curl -s http://127.0.0.1:4002/health  # {"status":"ok",...}
docker compose logs backend_fable --tail 30
```

No log do backend deve aparecer `Usuário admin inicial criado: ...`.

## 6. Nginx + HTTPS

```bash
cp deploy/nginx-fable.conf /etc/nginx/sites-available/fable
ln -s /etc/nginx/sites-available/fable /etc/nginx/sites-enabled/fable
nginx -t && systemctl reload nginx

certbot --nginx -d fable.amsx.online -d api.fable.amsx.online
```

O Certbot já deve estar instalado (foi usado no Rota). Se `certbot` não
existir: `apt install -y certbot python3-certbot-nginx`.

Abra **https://fable.amsx.online** e entre com `ADMIN_EMAIL` / `ADMIN_SENHA`.

---

## Atualizar depois de mudanças no código

No PC: `git add -A && git commit -m "..." && git push`. No VPS:

```bash
cd /opt/fable
git pull
docker compose up -d --build
```

As migrations do banco rodam sozinhas quando o backend sobe.

## Backup do banco

```bash
docker exec postgres_fable pg_dump -U postgres fable_db > /root/fable_$(date +%F).sql
```

Restaurar: `cat arquivo.sql | docker exec -i postgres_fable psql -U postgres fable_db`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Blocked request. This host is not allowed" | Domínio fora de `allowedHosts` em `frontend/vite.config.ts` |
| Login não responde / erro de rede | `VITE_API_URL` errado no `.env` — corrigir e rodar `docker compose up -d --build` |
| 502 Bad Gateway | Container parado: `docker compose ps` e `docker compose logs` |
| "port is already allocated" | Porta usada por outro projeto: trocar `DB_PORT` no `.env` |
