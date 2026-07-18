import { io } from 'socket.io-client';

// Target the WS server which runs on port 3001 during dev
const SOCKET_URL = window.location.port === '3000' || import.meta.env.DEV
  ? `http://${window.location.hostname}:3001` 
  : window.location.origin;

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We will connect manually when we have the workspace ID
});

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T;
}

