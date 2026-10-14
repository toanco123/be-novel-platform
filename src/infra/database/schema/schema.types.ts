import type { chapterViews } from './chapter-views'
import type { chapters } from './chapters'
import type { commentLikes } from './comment-likes'
import type { commentReports } from './comment-reports'
import type { comments } from './comments'
import type { curatedStories } from './curated-stories'
import type { emailTokens } from './email-tokens'
import type { follows } from './follows'
import type { genres } from './genres'
import type { oauthAccounts } from './oauth-accounts'
import type { profiles } from './profiles'
import type { ratings } from './ratings'
import type { readingHistory } from './reading-history'
import type { refreshTokens } from './refresh-tokens'
import type { stories } from './stories'
import type { storyGenres } from './story-genres'
import type { storyStats } from './story-stats'
import type { userBlocks } from './user-blocks'
import type { users } from './users'

/** Một dòng của bảng (kiểu Drizzle suy ra từ schema) */
export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
export type RefreshTokenRow = typeof refreshTokens.$inferSelect
export type EmailTokenRow = typeof emailTokens.$inferSelect
export type EmailTokenPurpose = EmailTokenRow['purpose']
export type OAuthAccountRow = typeof oauthAccounts.$inferSelect
export type OAuthProvider = OAuthAccountRow['provider']
export type GenreRow = typeof genres.$inferSelect
export type StoryRow = typeof stories.$inferSelect
export type StoryStatus = StoryRow['status']
export type PublicationStatus = StoryRow['visibility']
export type ReviewStatus = NonNullable<StoryRow['reviewStatus']>
export type StoryGenreRow = typeof storyGenres.$inferSelect
export type ChapterRow = typeof chapters.$inferSelect
export type StoryStatsRow = typeof storyStats.$inferSelect
export type ChapterViewRow = typeof chapterViews.$inferSelect
export type CuratedStoryRow = typeof curatedStories.$inferSelect
export type ReadingHistoryRow = typeof readingHistory.$inferSelect
export type FollowRow = typeof follows.$inferSelect
export type RatingRow = typeof ratings.$inferSelect
export type CommentRow = typeof comments.$inferSelect
export type UserBlockRow = typeof userBlocks.$inferSelect
export type CommentLikeRow = typeof commentLikes.$inferSelect
export type CommentReportRow = typeof commentReports.$inferSelect
export type CommentReportReason = CommentReportRow['reason']
