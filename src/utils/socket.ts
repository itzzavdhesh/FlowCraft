import { io } from 'socket.io-client';

// Target the WS server which runs on port 3001 during dev
const SOCKET_URL = window.location.port === '3000' || (import.meta as any).env?.DEV
  ? `http://${window.location.hostname}:3001` 
  : window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We will connect manually when we have the workspace ID
});

type DebouncedFunction<T extends (...args: any[]) => void> = T & { cancel: () => void, flush: () => void };

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout>;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;

  const debounced = function(this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(lastThis, lastArgs!);
      lastArgs = undefined;
    }, wait);
  } as DebouncedFunction<T>;
  
  debounced.cancel = () => {
    clearTimeout(timeout);
    lastArgs = undefined;
  };

  debounced.flush = () => {
    if (lastArgs) {
      clearTimeout(timeout);
      func.apply(lastThis, lastArgs);
      lastArgs = undefined;
    }
  };
  
  return debounced;
}

