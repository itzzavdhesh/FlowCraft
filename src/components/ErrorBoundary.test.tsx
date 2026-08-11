import { describe, it } from 'node:test';
import assert from 'node:assert';
import ErrorBoundary from './ErrorBoundary.js';

describe('ErrorBoundary', () => {
  it('getDerivedStateFromError returns correct state', () => {
    const error = new Error('Test child render failure');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    assert.strictEqual(state.hasError, true);
    assert.strictEqual(state.error, error);
  });

  it('componentDidCatch invokes onError with error and errorInfo', () => {
    let calledWithError: Error | null = null;
    let calledWithInfo: any = null;
    const boundary = new ErrorBoundary({
      onError: (err, info) => {
        calledWithError = err;
        calledWithInfo = info;
      },
    });

    const err = new Error('test err');
    const info = { componentStack: 'stack info' } as any;
    boundary.componentDidCatch(err, info);

    assert.strictEqual(calledWithError, err);
    assert.strictEqual(calledWithInfo, info);
  });

  it('componentDidCatch handles failures thrown by onError', () => {
    let threw = false;
    const boundary = new ErrorBoundary({
      onError: () => {
        threw = true;
        throw new Error('Logger failed');
      },
    });

    const origError = console.error;
    let logged = false;
    console.error = (msg, err) => {
      if (
        msg === 'Error in onError callback:' &&
        err?.message === 'Logger failed'
      ) {
        logged = true;
      }
    };

    try {
      boundary.componentDidCatch(new Error('test'), {
        componentStack: 'stack',
      } as any);
    } finally {
      console.error = origError;
    }

    assert.strictEqual(threw, true);
    assert.strictEqual(logged, true);
  });

  it('renders generic fallback when hasError is true and executes refresh', () => {
    const boundary = new ErrorBoundary({});
    boundary.state = {
      hasError: true,
      error: new Error('test render failure'),
    };

    const result = boundary.render() as any;
    assert.strictEqual(result.props.role, 'alert');

    const container = result.props.children;
    const button = container.props.children[3];
    assert.strictEqual(button.type, 'button');
    assert.strictEqual(button.props.children, 'Refresh Application');

    let reloaded = false;
    const mockWindow = {
      location: {
        reload: () => {
          reloaded = true;
        },
      },
    };
    const originalWindow = globalThis.window;

    try {
      (globalThis as any).window = mockWindow;
      button.props.onClick();
      assert.strictEqual(reloaded, true);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it('renders children when no error', () => {
    const boundary = new ErrorBoundary({ children: 'test child' as any });
    boundary.state = { hasError: false };
    const result = boundary.render();
    assert.strictEqual(result, 'test child');
  });
});
