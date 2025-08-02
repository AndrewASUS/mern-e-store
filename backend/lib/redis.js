import Redis from "ioredis" // Redis is key-value store
import dotenv from "dotenv"


dotenv.config()

export const redis = new Redis(process.env.UPSTASH_REDIS_URL);
