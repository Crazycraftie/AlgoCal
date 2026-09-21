import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AlgoCal header', () => {
  render(<App />);
  const headerElement = screen.getByText(/AlgoCal/i);
  expect(headerElement).toBeInTheDocument();
});
