import { activityFeedQuerySchema } from '@edin/shared';

export { activityFeedQuerySchema };
export type ActivityFeedQueryDto = {
  cursor?: string;
  limit: number;
  domain?: string;
};
