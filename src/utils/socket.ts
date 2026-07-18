import { io } from 'socket.io-client';

// Assuming the Vite server is on 3000 and the WS server is on 3001
const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
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

