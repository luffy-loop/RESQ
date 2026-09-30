# RESQ Deployment

## Frontend (Vercel)

Set:

```text
VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api
VITE_SOCKET_URL=https://YOUR-BACKEND-DOMAIN
```

Do not use localhost in production.

## Backend

Set:

```text
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=use_a_long_random_secret
PORT=5001
FRONTEND_URLS=https://YOUR-VERCEL-DOMAIN
OPENAI_API_KEY=
EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_MODEL=text-embedding-3-small
MONGO_VECTOR_INDEX=emergency_vector_index
```

## Demo data

From backend:

```bash
npm run seed
```

Demo password: `resq-demo-123`

Authority: `authority@resq.demo`
NGO: `ngo@resq.demo`
Volunteer: `aarav@resq.demo`
