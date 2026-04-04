export const CONFIG = {
  players: [
    { id: 'player_1', name: 'Troy', defaultEmoji: '🎯' },
    { id: 'player_2', name: 'Mum', defaultEmoji: '🌸' },
    { id: 'player_3', name: 'Dad', defaultEmoji: '⚡' },
  ],
  scoring: {
    correctPosition: 0,  // +0: correct letter, correct position
    correctLetter: 1,    // +1: correct letter, wrong position
    notInWord: 3,        // +3: letter not in word
  },
  resetHour: 4,          // new puzzle day starts at 4am local time
  wordLength: 5,
  lobbyPollIntervalMs: 30_000, // 30 seconds
  aws: {
    region: 'ap-southeast-2',
    bucketName: import.meta.env.VITE_S3_BUCKET_NAME as string,
    s3WebsiteUrl: import.meta.env.VITE_S3_WEBSITE_URL as string,
    cognitoIdentityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID as string,
  },
} as const

export type PlayerId = typeof CONFIG.players[number]['id']
