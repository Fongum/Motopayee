import { describe, it, expect } from 'vitest';
import {
  isPrivateBucket,
  isPublicBucket,
  PRIVATE_DOCUMENT_BUCKET,
  PUBLIC_MEDIA_BUCKET,
  STORAGE_BUCKETS,
} from './storage-buckets';

describe('storage buckets', () => {
  it('keeps the public and private buckets distinct', () => {
    expect(PUBLIC_MEDIA_BUCKET).not.toBe(PRIVATE_DOCUMENT_BUCKET);
    expect(STORAGE_BUCKETS).toEqual([PUBLIC_MEDIA_BUCKET, PRIVATE_DOCUMENT_BUCKET]);
  });

  it('treats only the media bucket as public', () => {
    expect(isPublicBucket(PUBLIC_MEDIA_BUCKET)).toBe(true);
    expect(isPublicBucket(PRIVATE_DOCUMENT_BUCKET)).toBe(false);
  });

  it('never treats an unknown bucket as public', () => {
    expect(isPublicBucket('documents')).toBe(false);
    expect(isPublicBucket('')).toBe(false);
    expect(isPublicBucket(null)).toBe(false);
    expect(isPublicBucket(undefined)).toBe(false);
    expect(isPublicBucket('listing-media-backup')).toBe(false);
  });

  it('identifies the private document bucket', () => {
    expect(isPrivateBucket(PRIVATE_DOCUMENT_BUCKET)).toBe(true);
    expect(isPrivateBucket(PUBLIC_MEDIA_BUCKET)).toBe(false);
    expect(isPrivateBucket(null)).toBe(false);
  });
});
