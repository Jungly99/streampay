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

// Google Cloud TTS — 48 Indian voices
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    text: z.string().min(1).max(500),
    voiceId: z.string().min(1).max(50),
    volume: z.number().min(0).max(100).default(100),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

  if (!env.GOOGLE_TTS_API_KEY) {
    res.status(503).json({ error: 'Google TTS not configured' })
    return
  }

  const { text, voiceId, volume } = parsed.data
  // Extract language code: hi-IN-Standard-A → hi-IN
  const parts = voiceId.split('-')
  const languageCode = `${parts[0]}-${parts[1]}`

  const upstream = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${env.GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceId },
        audioConfig: {
          audioEncoding: 'MP3',
          volumeGainDb: volume < 40 ? -6 : volume > 85 ? 3 : 0,
        },
      }),
    }
  )

  if (!upstream.ok) {
    const err = await upstream.text().catch(() => 'Unknown error')
    console.error('Google TTS error:', upstream.status, err)
    res.status(502).json({ error: 'TTS generation failed' })
    return
  }

  const data = await upstream.json() as { audioContent: string }
  const audio = Buffer.from(data.audioContent, 'base64')
  res.set('Content-Type', 'audio/mpeg')
  res.set('Content-Length', String(audio.length))
  res.set('Cache-Control', 'public, max-age=300')
  res.send(audio)
})

export default router
