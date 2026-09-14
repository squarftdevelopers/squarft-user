import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { authApi } from '../services/authApi';
import BrowseLocation from '../app/(screens)/browse-location';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../services/authApi', () => ({ authApi: { getBranches: jest.fn() } }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), Accuracy: { Balanced: 3 } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon', MaterialCommunityIcons: 'Icon' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

beforeEach(() => {
  jest.clearAllMocks();
  authApi.getBranches.mockResolvedValue([{ id: 'branch-a', name: 'Central', city: 'Indore' }, { id: 'branch-b', name: 'North', city: 'Bhopal' }]);
});

test('loads real branches, searches them, and opens the standard listing with the selected id', async () => {
  await render(<BrowseLocation />);
  await screen.findByText('Central');
  await fireEvent.changeText(screen.getByLabelText('Search branches or cities'), 'Bhopal');
  expect(screen.queryByText('Central')).toBeNull();
  await fireEvent.press(screen.getByLabelText('View projects in North'));
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'filter/clearFilters' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(screens)/property-listing', params: { branchId: 'branch-b', branchName: 'North' } });
});

test('current location opens the standard listing with GPS coordinates', async () => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 22.72, longitude: 75.86 } });
  await render(<BrowseLocation />);
  await fireEvent.press(screen.getByText('Use current location'));
  await screen.findByText('Use current location');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(screens)/property-listing', params: { locationFilter: '1', latitude: '22.72', longitude: '75.86', locationName: 'Current location' } });
});

test('denied permission keeps the branch picker available without navigating', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
  await render(<BrowseLocation />);
  await fireEvent.press(screen.getByText('Use current location'));
  await screen.findByText('Use current location');
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

test('branch fetch failure can be retried', async () => {
  authApi.getBranches.mockRejectedValueOnce(new Error('offline'));
  await render(<BrowseLocation />);
  await fireEvent.press(await screen.findByText('Try again'));
  await screen.findByText('Central');
  expect(authApi.getBranches).toHaveBeenCalledTimes(2);
});
