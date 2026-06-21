// Socket event payloads
export interface NewDonationEvent {
  donationId: string
  donorName: string
  message: string | null
  amount: number // in rupees
  voiceMessageUrl: string | null
  streamerUsername: string
}

export interface GoalUpdatedEvent {
  currentAmount: number
  targetAmount: number
  title: string
}

export interface OverlayJoinedEvent {
  streamerId: string
  settings: AlertSettings
}

// Shared types
export interface AlertSettings {
  template: 'superchat' | 'colorful' | 'custom'
  bgColor: string
  bgOpacity: number
  textColor: string
  fontSize: number
  fontStyle: string
  textBold: boolean
  textItalic: boolean
  textUnderline: boolean
  animationStyle: string
  enableBorder: boolean
  ttsEnabled: boolean
  ttsVolume: number
  ttsVoice: string
  voiceMessagesEnabled: boolean
  alertDuration: number
}

export interface DonationPageStreamer {
  id: string
  username: string
  channelName: string
  avatarUrl: string | null
  bio: string | null
  channelLink: string | null
  isVerified: boolean
  minDonationAmount: number
  voiceTiers: VoiceTier[]
  quickAmounts: number[]
  socialTwitter: string | null
  socialInstagram: string | null
  socialYoutube: string | null
  socialTwitch: string | null
  socialDiscord: string | null
  socialKick: string | null
}

export interface VoiceTier {
  durationSeconds: number
  minAmount: number
  isEnabled: boolean
}
