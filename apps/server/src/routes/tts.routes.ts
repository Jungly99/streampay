import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { env } from '../config/env'

const router = Router()

router.post('/celebrity', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    text: z.string().min(1).max(300),
    voiceId: z.string().min(1).max(100),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'text (max 300 chars) and voiceId are required' }); return }

  if (!env.ELEVENLABS_API_KEY) {
    res.status(503).json({ error: 'Celebrity voice not configured' })
    return
  }

  const { text, voiceId } = parsed.data

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => 'Unknown error')
    console.error('ElevenLabs error:', upstream.status, err)
    res.status(502).json({ error: 'Voice generation failed' })
    return
  }

  res.set('Content-Type', 'audio/mpeg')
  res.set('Cache-Control', 'no-store')

  const reader = upstream.body?.getReader()
  if (!reader) { res.status(502).json({ error: 'No audio stream' }); return }

  const pump = async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) { res.end(); break }
      if (!res.write(value)) {
        await new Promise(r => res.once('drain', r))
      }
    }
  }
  pump().catch(() => res.end())
})

export default router
