import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders initial message', () => {
  render(<App />);
  const textElement = screen.getByText(/Type in a search/i);
  expect(textElement).toBeInTheDocument();
});

test('shows results window after searching', async () => {
  const searchResponse = {
    items: [
      {
        id: { videoId: 'abc123' },
        snippet: {
          title: 'Test Video',
          thumbnails: { medium: { url: 'thumb.jpg' } },
        },
      },
    ],
  };

  const detailsResponse = {
    items: [
      {
        id: 'abc123',
        contentDetails: { duration: 'PT1M' },
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ json: async () => searchResponse })
    .mockResolvedValueOnce({ json: async () => detailsResponse });

  render(<App />);
  const input = screen.getByRole('textbox');
  await userEvent.type(input, 'music{enter}');

  await waitFor(() => {
    expect(screen.getByText('Test Video')).toBeInTheDocument();
  });
});
