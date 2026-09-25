import Redis from "ioredis"

//lê a url do redis das variáveis de ambiente ou usa a conexão local padrão
const REDIS_URL = process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSOWRD || "REDIS_PASSWORD"}@localhost:6379`

//Padrão singleton com next.js. Isso faz usar a mesma instância do redis o programa todo, ao invés de ficar abrindo uma nova igual um tonto
const globalForRedis = globalThis as unknown as { redisClient: Redis | undefined }

export const redis = globalForRedis.redisClient ??
    new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        connectTimeout: 2000,
        commandTimeout: 1000,
        lazyConnect: false
    })

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redisClient = redis;
}