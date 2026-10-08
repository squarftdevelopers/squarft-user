import { expect, test } from '@jest/globals';
import { getProjectImageUrls } from '../services/projectDisplay';

test('collects unique project gallery images and excludes non-image media', () => {
  expect(getProjectImageUrls({
    cover_image_url: 'https://cdn.test/cover.jpg',
    media: [
      { media_type: 'image', url: 'https://cdn.test/cover.jpg' },
      { media_type: 'image', url: 'https://cdn.test/gallery-2.jpg' },
      { media_type: 'document', url: 'https://cdn.test/brochure.pdf' },
    ],
    projectImages: [{ uri: 'https://cdn.test/gallery-3.jpg' }],
  })).toEqual([
    'https://cdn.test/cover.jpg',
    'https://cdn.test/gallery-2.jpg',
    'https://cdn.test/gallery-3.jpg',
  ]);
});
