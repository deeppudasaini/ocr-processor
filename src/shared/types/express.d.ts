declare global {
  namespace Express {
    interface Request {
      /** UUID injected per request for tracing / logging */
      requestId: string;
    }
  }
}

export {};
