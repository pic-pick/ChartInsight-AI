import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => {
  const React = require('react');
  const Anchor = ({ children, className, to, href, ...props }) => (
    <a className={className} href={href || to || '#'} {...props}>
      {children}
    </a>
  );

  return {
    MemoryRouter: ({ children }) => <div>{children}</div>,
    Link: Anchor,
    NavLink: Anchor,
    Routes: ({ children }) => <div>{children}</div>,
    Route: ({ element }) => element,
    useParams: () => ({}),
    useNavigate: () => () => {},
  };
});

jest.mock('./api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('./router/AppRouter', () => () => <div>Mocked Router</div>);

import App from './App';

test('renders dashboard header brand', () => {
  render(
    <React.Suspense fallback={null}>
      <App />
    </React.Suspense>
  );

  const brandElements = screen.getAllByText(/ChartInsight AI/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
