import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { redis } from './redis'
import * as supabaseServer from '../supabase/server'
import { getStoreWithActiveDrop, invalidateStorefrontCache } from '../db/storefront'

const mockStoreData = {
    id: 'store-123',
    name: 'Loja Teste',
    slug: 'loja-teste-cache',
    is_active: true,
}

const mockSupabase = {
    from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockStoreData, error: null}),
    }),
}

describe('Storefront cache-aside with redis', () => {
    const testSlug = 'loja-teste-cache'
    const cacheKey = `v1:storefront:${testSlug}`

    beforeEach(async () => {
        await redis.del(cacheKey) //só pra certificar de que o cache está vazio
        vi.clearAllMocks()
        // espiona o createClient do supabase
        vi.spyOn(supabaseServer, 'createClient').mockResolvedValue(mockSupabase as any)
    })

    afterAll(async () => {
        // limpeza final da chave
        await redis.del(cacheKey)
    })

    it('Should consult supabase after a cache miss and save it to redis', async () => {
        // Executa a busca da vitrine
        await getStoreWithActiveDrop(testSlug)

        // O supabase deve ter sido chamado no miss
        expect(supabaseServer.createClient).toHaveBeenCalled()

        //o dado deve existir gravado no redis
        const cachedString = await redis.get(cacheKey)
        expect(cachedString).not.toBeNull()

        const cachedJson = JSON.parse(cachedString!)
        expect(cachedJson.store.name).toBe('Loja Teste')

        const ttl = await redis.ttl(cacheKey)
        expect(ttl).toBeGreaterThan(0)
        expect(ttl).toBeLessThanOrEqual(600)
    })

    it('Should return from redis and not consult supabase after a cache hit', async () => {
        const fakeCachedStore = {
            store: {...mockStoreData, name: 'Loja do Cache'},
            categories: [],
            activeDrop: null,
            activeDrops: [],
            catalogProducts: [],
            combos: [],
            faqs: []
        }
        await redis.setex(cacheKey, 600, JSON.stringify(fakeCachedStore))

        const result = await getStoreWithActiveDrop(testSlug)

        expect(result?.store.name).toBe('Loja do Cache')
        expect(supabaseServer.createClient).not.toHaveBeenCalled()
    })

    it('Should evict data from redis', async () => {
        await redis.set(cacheKey, 'dados-temporarios')

        await invalidateStorefrontCache(testSlug)

        const exists = await redis.get(cacheKey)
        expect(exists).toBeNull()
    })

    it('Should return data even with redis down', async () => {
        //força  o redis a disparar um erro
        vi.spyOn(redis, 'get').mockRejectedValue(new Error('Conexão perdida'))

        //a função não pode quebrar, deve cair no catch e chamar o supabase
        const result = await getStoreWithActiveDrop(testSlug)
        expect(supabaseServer.createClient).toHaveBeenCalled()
    })
})