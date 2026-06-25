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
  enableShadow: boolean
  shadowBlur: number
  shadowColor: string
  shadowOpacity: number
  shadowOffsetX: number
  shadowOffsetY: number
  enableGradientBg: boolean
  enableCoinSound: boolean
  coinSoundVolume: number
  ttsSoundDelay: number
  ttsRate: number
  ttsPitch: number
  minAlertAmount: number
  minTtsAmount: number
  goalBarColor: string
  enableGoalCelebration: boolean
  enableBirthday: boolean
  birthdayTemplate: string
  enableProfanityFilter: boolean
  customBlocklist: string
  celebrityVoiceEnabled: boolean
  celebrityVoiceId: string | null
  celebrityVoiceMinAmount: number
}

export interface DonationPageStreamer {
  id: string
  username: string
  channelName: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  channelLink: string | null
  isVerified: boolean
  minDonationAmount: number
  messageMaxLength: number
  messageTiers: MessageTier[]
  voiceTiers: VoiceTier[]
  quickAmounts: number[]
  socialTwitter: string | null
  socialInstagram: string | null
  socialYoutube: string | null
  socialTwitch: string | null
  socialDiscord: string | null
  socialKick: string | null
  voiceMessagesEnabled: boolean
  celebrityVoiceEnabled: boolean
  celebrityVoiceMinAmount: number
}

export interface MessageTier {
  minAmount: number
  charLimit: number
}

export interface VoiceTier {
  durationSeconds: number
  minAmount: number
  isEnabled: boolean
}
