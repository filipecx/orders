import { z } from 'zod'

export const authCredentialsSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório.')
    .email('Formato de e-mail inválido.')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres.')
    .max(72, 'A senha não pode ultrapassar 72 caracteres.'),
})

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>
