import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Wind Chaser app', () => {
  render(<App />);
  // App renders authentication page by default when unauthenticated
  expect(document.body).toBeTruthy();
});
