import { render, screen } from '@testing-library/react';
import App from './App';

test('renders initial message', () => {
  render(<App />);
  const textElement = screen.getByText(/Type in a search/i);
  expect(textElement).toBeInTheDocument();
});
