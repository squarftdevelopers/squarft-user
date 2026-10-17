import { jest, test, expect } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProgressiveImage from '../components/ProgressiveImage';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../components/SkeletonLoader', () => ({ Shimmer: () => null }));

test('missing image shows an explicit empty state', async () => {
  await render(<ProgressiveImage source={null} style={{ width: 278, height: 150 }} />);
  expect(screen.getByText('No image available')).toBeTruthy();
});

test('failed real image shows an empty state instead of a replacement photo', async () => {
  await render(<ProgressiveImage source={{ uri: 'https://cdn.test/project.jpg' }} testID="project-photo" />);
  await fireEvent(screen.getByTestId('project-photo'), 'error', { nativeEvent: {} });
  expect(screen.getByText('No image available')).toBeTruthy();
  expect(screen.queryByTestId('project-photo')).toBeNull();
});
