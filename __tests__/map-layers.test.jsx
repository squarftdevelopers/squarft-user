import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text } from 'react-native';
import { jest, test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MapWithLayers from '../components/MapWithLayers';
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const animateToRegion = jest.fn();
const NativeMap = forwardRef(function NativeMap(props, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion }));
  return <View {...props} testID="native-map" />;
});
test('switches standard, satellite and hybrid without replacing the map or markers', async () => {
  await render(<MapWithLayers component={NativeMap} style={{ height: 300 }}><Text>Project marker</Text></MapWithLayers>);
  expect(screen.getByTestId('native-map').props.mapType).toBe('standard');
  await fireEvent.press(screen.getByLabelText('Change map appearance'));
  await fireEvent.press(screen.getByLabelText('Satellite map'));
  expect(screen.getByTestId('native-map').props.mapType).toBe('satellite');
  expect(screen.getByText('Project marker')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Change map appearance'));
  await fireEvent.press(screen.getByLabelText('Hybrid map'));
  expect(screen.getByTestId('native-map').props.mapType).toBe('hybrid');
  await fireEvent.press(screen.getByLabelText('Change map appearance'));
  await fireEvent.press(screen.getByLabelText('Standard map'));
  expect(screen.getByTestId('native-map').props.mapType).toBe('standard');
});
test('preserves native map methods, events, provider and route props', async () => {
  const ref = createRef();
  const onPress = jest.fn();
  await render(<MapWithLayers component={NativeMap} ref={ref} onPress={onPress} provider="google" showsUserLocation />);
  ref.current.animateToRegion({ latitude: 22, longitude: 75 });
  expect(animateToRegion).toHaveBeenCalledWith({ latitude: 22, longitude: 75 });
  expect(screen.getByTestId('native-map').props.provider).toBe('google');
  expect(screen.getByTestId('native-map').props.showsUserLocation).toBe(true);
  await fireEvent.press(screen.getByTestId('native-map'));
  expect(onPress).toHaveBeenCalled();
});
